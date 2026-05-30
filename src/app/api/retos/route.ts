import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/retos ────────────────────────────────────────────────────────────

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const role = String(user.role);

  const challenges = await prisma.challenge.findMany({
    where: { author: { schoolId: user.schoolId } },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      class:  { select: { id: true, name: true } },
      entries: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
  });

  // Alumnos: filtrar solo los que corresponden
  let visible = challenges;
  if (role === "student") {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: user.id, status: "active" },
      select: { classId: true },
    });
    const enrolledIds = new Set(enrollments.map((e) => e.classId));

    visible = challenges.filter((c) => {
      if (c.targetType === "all") return true;
      if (c.targetType === "class" && c.classId && enrolledIds.has(c.classId)) return true;
      if (c.targetType === "student" && c.targetId === user.id) return true;
      return false;
    });
  }

  return NextResponse.json(
    visible.map((c) => {
      const myEntry = c.entries.find((e) => e.userId === user.id);
      return {
        id:           c.id,
        title:        c.title,
        description:  c.description,
        points:       c.points,
        dueDate:      c.dueDate?.toISOString() ?? null,
        targetType:   c.targetType,
        targetId:     c.targetId ?? null,
        classId:      c.classId ?? null,
        className:    c.class?.name ?? null,
        createdAt:    c.createdAt.toISOString(),
        author:       c.author,
        // New type fields
        type:         (c as any).type ?? "simple",
        questions:    (c as any).questions ?? null,
        practiceGoal: (c as any).practiceGoal ?? null,
        myEntry: myEntry
          ? {
              id:            myEntry.id,
              status:        myEntry.status,
              completedAt:   myEntry.completedAt?.toISOString() ?? null,
              validatedAt:   myEntry.validatedAt?.toISOString() ?? null,
              note:          myEntry.note,
              // New entry fields
              mediaUrl:      (myEntry as any).mediaUrl ?? null,
              answers:       (myEntry as any).answers ?? null,
              practiceCount: (myEntry as any).practiceCount ?? 0,
            }
          : null,
        entriesCount:   c.entries.length,
        validatedCount: c.entries.filter((e) => e.status === "validated").length,
        completedCount: c.entries.filter((e) => e.status !== "pending").length,
        // Detalle completo de entries solo para admin/teacher
        entries: role !== "student"
          ? c.entries.map((e) => ({
              id:            e.id,
              userId:        e.userId,
              status:        e.status,
              completedAt:   e.completedAt?.toISOString() ?? null,
              validatedAt:   e.validatedAt?.toISOString() ?? null,
              note:          e.note,
              user:          e.user,
              mediaUrl:      (e as any).mediaUrl ?? null,
              answers:       (e as any).answers ?? null,
              practiceCount: (e as any).practiceCount ?? 0,
            }))
          : undefined,
      };
    }),
  );
}

// ── POST /api/retos ───────────────────────────────────────────────────────────

type PostBody = {
  title?:        string;
  description?:  string;
  points?:       number;
  dueDate?:      string | null;
  targetType?:   string;
  classId?:      string | null;
  targetId?:     string | null;
  type?:         string;
  questions?:    unknown;
  practiceGoal?: number | null;
};

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const role = String(user.role);
  if (role !== "admin" && role !== "teacher")
    return NextResponse.json({ error: "Solo admin/profesor puede crear retos" }, { status: 403 });

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { title, description, points, dueDate, targetType, classId, targetId, type, questions, practiceGoal } = body;

  if (!title?.trim() || !description?.trim())
    return NextResponse.json({ error: "Título y descripción son requeridos" }, { status: 400 });

  const pts = points ?? 10;
  if (pts < 1 || pts > 100)
    return NextResponse.json({ error: "Los puntos deben estar entre 1 y 100" }, { status: 400 });

  const challengeType = type ?? "simple";
  const validTypes = ["simple", "quiz", "multimedia", "practice"];
  if (!validTypes.includes(challengeType))
    return NextResponse.json({ error: "Tipo de reto inválido" }, { status: 400 });

  if (challengeType === "quiz" && (!Array.isArray(questions) || (questions as unknown[]).length === 0))
    return NextResponse.json({ error: "Un reto de tipo quiz debe tener al menos una pregunta" }, { status: 400 });

  if (challengeType === "practice" && (!practiceGoal || practiceGoal < 1))
    return NextResponse.json({ error: "Un reto de práctica debe tener una meta de repeticiones" }, { status: 400 });

  const challenge = await prisma.challenge.create({
    data: {
      title:        title.trim(),
      description:  description.trim(),
      points:       pts,
      dueDate:      dueDate ? new Date(dueDate) : null,
      createdBy:    user.id,
      targetType:   targetType ?? "all",
      classId:      classId ?? null,
      targetId:     targetId ?? null,
      type:         challengeType,
      questions:    challengeType === "quiz" ? (questions as any) : undefined,
      practiceGoal: challengeType === "practice" ? (practiceGoal ?? null) : null,
    } as any,
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      class:  { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    {
      id:           challenge.id,
      title:        challenge.title,
      description:  challenge.description,
      points:       challenge.points,
      dueDate:      challenge.dueDate?.toISOString() ?? null,
      targetType:   challenge.targetType,
      targetId:     challenge.targetId ?? null,
      classId:      challenge.classId ?? null,
      className:    challenge.class?.name ?? null,
      createdAt:    challenge.createdAt.toISOString(),
      author:       challenge.author,
      type:         (challenge as any).type ?? "simple",
      questions:    (challenge as any).questions ?? null,
      practiceGoal: (challenge as any).practiceGoal ?? null,
      myEntry:      null,
      entriesCount:   0,
      validatedCount: 0,
      completedCount: 0,
      entries:        [],
    },
    { status: 201 },
  );
}
