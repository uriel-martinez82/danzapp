import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Devuelve el rango de un día en UTC para buscar por sessionDate */
function dayRange(dateStr: string): { gte: Date; lte: Date } {
  return {
    gte: new Date(`${dateStr}T00:00:00.000Z`),
    lte: new Date(`${dateStr}T23:59:59.999Z`),
  };
}

/** sessionDate normalizado a medianoche UTC */
function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// ── GET /api/asistencia?classId=...&date=YYYY-MM-DD ───────────────────────────

export async function GET(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const classId = searchParams.get("classId");
  const date    = searchParams.get("date");

  if (!classId || !date)
    return NextResponse.json({ error: "classId y date son requeridos" }, { status: 400 });

  // Verificar que el usuario tiene acceso a esta clase
  const clase = await prisma.class.findUnique({ where: { id: classId } });
  if (!clase || clase.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });

  if (user.role === "student") {
    // El alumno solo puede ver su propio registro
    const enrollment = await prisma.enrollment.findFirst({
      where: { classId, studentId: user.id, status: "active" },
    });
    if (!enrollment)
      return NextResponse.json({ error: "No inscripto en esta clase" }, { status: 403 });
  } else if (user.role === "teacher" && clase.teacherId !== user.id) {
    return NextResponse.json({ error: "Sin acceso a esta clase" }, { status: 403 });
  }

  // Enrollments activos con datos del alumno
  const enrollments = await prisma.enrollment.findMany({
    where: { classId, status: "active" },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      attendance: {
        where: { sessionDate: dayRange(date) },
        take: 1,
      },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  // Serializar (Date → string para la respuesta JSON)
  const result = enrollments.map((e) => ({
    enrollmentId: e.id,
    student: e.student,
    attendance: e.attendance[0]
      ? {
          id:          e.attendance[0].id,
          status:      e.attendance[0].status,
          sessionDate: e.attendance[0].sessionDate.toISOString(),
        }
      : null,
  }));

  return NextResponse.json(result);
}

// ── POST /api/asistencia ──────────────────────────────────────────────────────

type AttendanceRecord = {
  enrollmentId: string;
  status: string;
};

type PostBody = {
  classId?: string;
  date?: string;
  records?: AttendanceRecord[];
};

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Solo profesores y admins pueden guardar asistencia
  if (user.role === "student")
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { classId, date, records } = body;

  if (!classId || !date)
    return NextResponse.json({ error: "classId y date son requeridos" }, { status: 400 });
  if (!Array.isArray(records) || records.length === 0)
    return NextResponse.json({ error: "records es requerido" }, { status: 400 });

  // Verificar acceso a la clase
  const clase = await prisma.class.findUnique({ where: { id: classId } });
  if (!clase || clase.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  if (user.role === "teacher" && clase.teacherId !== user.id)
    return NextResponse.json({ error: "Sin acceso a esta clase" }, { status: 403 });

  const sessionDate = parseDate(date);
  const range       = dayRange(date);
  const validStatuses = new Set(["present", "absent", "late", "justified"]);

  // Upsert manual: sin unique compuesto en el schema → findFirst + update/create
  const ops = records.map(async ({ enrollmentId, status }) => {
    if (!validStatuses.has(status)) return; // ignora estados inválidos

    const existing = await prisma.attendance.findFirst({
      where: { enrollmentId, sessionDate: range },
    });

    if (existing) {
      return prisma.attendance.update({
        where: { id: existing.id },
        data:  { status },
      });
    }

    return prisma.attendance.create({
      data: { enrollmentId, sessionDate, status },
    });
  });

  await Promise.all(ops);

  return NextResponse.json({ ok: true });
}
