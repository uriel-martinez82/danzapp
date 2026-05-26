import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  });

  if (!user?.schoolId) {
    return NextResponse.json({ error: "El usuario no tiene una escuela asignada" }, { status: 400 });
  }

  const announcements = await prisma.announcement.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { firstName: true, lastName: true, email: true },
      },
      _count: {
        select: { reads: true },
      },
    },
  });

  return NextResponse.json(announcements);
}

export async function POST(request: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  });

  if (!user?.schoolId) {
    return NextResponse.json({ error: "El usuario no tiene una escuela asignada" }, { status: 400 });
  }

  let body: { title?: string; body?: string; audience?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { title, body: announcementBody, audience = "all" } = body;

  if (!title?.trim() || !announcementBody?.trim()) {
    return NextResponse.json({ error: "El título y el mensaje son requeridos" }, { status: 422 });
  }

  const validAudiences = ["all", "teachers", "students"];
  if (!validAudiences.includes(audience)) {
    return NextResponse.json({ error: "Audiencia inválida" }, { status: 422 });
  }

  const announcement = await prisma.announcement.create({
    data: {
      schoolId: user.schoolId,
      authorId: user.id,
      title: title.trim(),
      body: announcementBody.trim(),
      audience,
      sentAt: new Date(),
    },
  });

  return NextResponse.json(announcement, { status: 201 });
}
