import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/notificaciones ───────────────────────────────────────────────────

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const notifications = await prisma.notification.findMany({
    where:   { schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      reads:  { select: { userId: true } },
    },
  });

  return NextResponse.json(
    notifications.map((n) => ({
      id:        n.id,
      title:     n.title,
      body:      n.body,
      createdAt: n.createdAt.toISOString(),
      createdBy: n.createdBy,
      author:    n.author,
      // El creador siempre la ve como leída; los demás dependen de NotificationRead
      readByMe:  n.createdBy === user.id
        ? true
        : n.reads.some((r) => r.userId === user.id),
    })),
  );
}

// ── POST /api/notificaciones ──────────────────────────────────────────────────

type PostBody = { title?: string; body?: string };

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  if (String(user.role) !== "admin")
    return NextResponse.json({ error: "Solo el admin puede crear comunicados" }, { status: 403 });

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { title, body: msgBody } = body;
  if (!title?.trim() || !msgBody?.trim())
    return NextResponse.json({ error: "Título y cuerpo son requeridos" }, { status: 400 });

  const notification = await prisma.notification.create({
    data: {
      schoolId:  user.schoolId,
      title:     title.trim(),
      body:      msgBody.trim(),
      createdBy: user.id,
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(
    {
      id:        notification.id,
      title:     notification.title,
      body:      notification.body,
      createdAt: notification.createdAt.toISOString(),
      createdBy: notification.createdBy,
      author:    notification.author,
      readByMe:  false,
    },
    { status: 201 },
  );
}
