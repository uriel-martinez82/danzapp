import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classes = await prisma.class.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { name: "asc" },
    include: {
      teacher: { select: { firstName: true, lastName: true, email: true } },
      schedules: { orderBy: { dayOfWeek: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json(classes);
}

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    name?: string;
    style?: string;
    level?: string;
    room?: string;
    capacity?: number | string;
    teacherId?: string;
    schedules?: { dayOfWeek: number | string; startTime: string; endTime: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, style, level, room, capacity, teacherId, schedules } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  if (!teacherId)
    return NextResponse.json({ error: "El profesor es requerido" }, { status: 400 });

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Profesor no encontrado" }, { status: 400 });

  const newClass = await prisma.$transaction(async (tx) => {
    const cls = await tx.class.create({
      data: {
        schoolId: user.schoolId!,
        teacherId,
        name: name.trim(),
        style: style?.trim() || null,
        level: level || null,
        room: room?.trim() || null,
        capacity: capacity ? Number(capacity) : null,
      },
    });

    if (schedules && schedules.length > 0) {
      await tx.classSchedule.createMany({
        data: schedules.map((s) => ({
          classId: cls.id,
          dayOfWeek: Number(s.dayOfWeek),
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
    }

    return cls;
  });

  return NextResponse.json(newClass, { status: 201 });
}
