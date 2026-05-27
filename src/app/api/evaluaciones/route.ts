import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/evaluaciones?classId=... ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId)
    return NextResponse.json({ error: "classId es requerido" }, { status: 400 });

  // Verificar acceso a la clase
  const clase = await prisma.class.findUnique({ where: { id: classId } });
  if (!clase || clase.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });

  const role = String(user.role);
  if (role === "teacher" && clase.teacherId !== user.id)
    return NextResponse.json({ error: "Sin acceso a esta clase" }, { status: 403 });
  if (role === "student") {
    const enrolled = await prisma.enrollment.findFirst({
      where: { classId, studentId: user.id, status: "active" },
    });
    if (!enrolled)
      return NextResponse.json({ error: "No inscripto en esta clase" }, { status: 403 });
  }

  const evaluaciones = await prisma.evaluation.findMany({
    where:   { classId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { evalDate: "desc" },
  });

  return NextResponse.json(
    evaluaciones.map((e) => ({
      ...e,
      evalDate: e.evalDate.toISOString(),
    })),
  );
}

// ── POST /api/evaluaciones ────────────────────────────────────────────────────

type PostBody = {
  classId?:       string;
  studentId?:     string;
  score?:         number;
  levelAchieved?: string;
  notes?:         string;
  evalDate?:      string;
};

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const role = String(user.role);
  if (role === "student")
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { classId, studentId, score, levelAchieved, notes, evalDate } = body;

  if (!classId || !studentId)
    return NextResponse.json({ error: "classId y studentId son requeridos" }, { status: 400 });

  // Validar rango de score
  if (score !== undefined && (score < 1 || score > 10))
    return NextResponse.json({ error: "El score debe estar entre 1 y 10" }, { status: 400 });

  // Verificar que la clase existe y pertenece a la escuela del usuario
  const clase = await prisma.class.findUnique({ where: { id: classId } });
  if (!clase || clase.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  if (role === "teacher" && clase.teacherId !== user.id)
    return NextResponse.json({ error: "Sin acceso a esta clase" }, { status: 403 });

  // Verificar que el alumno existe
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

  const evaluation = await prisma.evaluation.create({
    data: {
      classId,
      studentId,
      teacherId:     user.id,
      score:         score ?? null,
      levelAchieved: levelAchieved?.trim() || null,
      notes:         notes?.trim() || null,
      evalDate:      evalDate
        ? new Date(`${evalDate}T00:00:00.000Z`)
        : new Date(),
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(
    { ...evaluation, evalDate: evaluation.evalDate.toISOString() },
    { status: 201 },
  );
}
