import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── POST /api/retos/[id]/completar ────────────────────────────────────────────
// Body varies by challenge type:
//   simple:     {} (no extra data needed)
//   quiz:       { answers: QuizAnswer[] }
//   multimedia: { mediaUrl: string }
//   practice:   { increment: true }

type QuizAnswer = { questionIndex: number; selectedOption: number };
type CompletarBody = {
  answers?:   QuizAnswer[];
  mediaUrl?:  string;
  increment?: boolean;
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

  if (String(user.role) !== "student")
    return NextResponse.json({ error: "Solo los alumnos pueden completar retos" }, { status: 403 });

  const { id: challengeId } = await params;

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge)
    return NextResponse.json({ error: "Reto no encontrado" }, { status: 404 });

  const existing = await prisma.challengeEntry.findUnique({
    where: { challengeId_userId: { challengeId, userId: user.id } },
  });

  if (existing?.status === "validated")
    return NextResponse.json({ error: "Este reto ya fue validado" }, { status: 409 });

  let body: CompletarBody = {};
  try {
    body = await req.json();
  } catch {
    // OK — some types send no body
  }

  const challengeType: string = (challenge as any).type ?? "simple";

  // ── Practice: increment counter ────────────────────────────────────────────
  if (challengeType === "practice") {
    const practiceGoal: number = (challenge as any).practiceGoal ?? 1;
    const currentCount = (existing as any)?.practiceCount ?? 0;
    const newCount = currentCount + 1;
    const completed = newCount >= practiceGoal;

    const entry = await prisma.challengeEntry.upsert({
      where: { challengeId_userId: { challengeId, userId: user.id } },
      create: {
        challengeId,
        userId:        user.id,
        status:        completed ? "completed" : "pending",
        completedAt:   completed ? new Date() : null,
        practiceCount: newCount,
      } as any,
      update: {
        practiceCount: newCount,
        status:        completed ? "completed" : existing?.status ?? "pending",
        completedAt:   completed && !existing?.completedAt ? new Date() : existing?.completedAt ?? null,
      } as any,
    });

    return NextResponse.json({
      ok:           true,
      practiceCount: newCount,
      practiceGoal,
      completed,
      entry: {
        id:            entry.id,
        status:        entry.status,
        completedAt:   entry.completedAt?.toISOString() ?? null,
        validatedAt:   entry.validatedAt?.toISOString() ?? null,
        note:          entry.note,
        practiceCount: newCount,
        mediaUrl:      (entry as any).mediaUrl ?? null,
        answers:       (entry as any).answers ?? null,
      },
    });
  }

  // ── Quiz: save answers and score ───────────────────────────────────────────
  if (challengeType === "quiz") {
    const answers = body.answers;
    if (!Array.isArray(answers) || answers.length === 0)
      return NextResponse.json({ error: "Se requieren las respuestas del quiz" }, { status: 400 });

    const questions: Array<{ question: string; options: string[]; correct: number }> =
      (challenge as any).questions ?? [];

    const scored = answers.map((a) => {
      const q = questions[a.questionIndex];
      return {
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption,
        correct: q ? a.selectedOption === q.correct : false,
      };
    });

    const entry = await prisma.challengeEntry.upsert({
      where: { challengeId_userId: { challengeId, userId: user.id } },
      create: {
        challengeId,
        userId:      user.id,
        status:      "completed",
        completedAt: new Date(),
        answers:     scored as any,
      } as any,
      update: {
        status:      "completed",
        completedAt: new Date(),
        answers:     scored as any,
      } as any,
    });

    const correctCount = scored.filter((s) => s.correct).length;

    return NextResponse.json({
      ok:           true,
      correctCount,
      totalQuestions: questions.length,
      entry: {
        id:            entry.id,
        status:        entry.status,
        completedAt:   entry.completedAt?.toISOString() ?? null,
        validatedAt:   entry.validatedAt?.toISOString() ?? null,
        note:          entry.note,
        answers:       (entry as any).answers,
        mediaUrl:      (entry as any).mediaUrl ?? null,
        practiceCount: (entry as any).practiceCount ?? 0,
      },
    });
  }

  // ── Multimedia: save mediaUrl ──────────────────────────────────────────────
  if (challengeType === "multimedia") {
    const mediaUrl = body.mediaUrl;
    if (!mediaUrl)
      return NextResponse.json({ error: "Se requiere la URL del medio subido" }, { status: 400 });

    const entry = await prisma.challengeEntry.upsert({
      where: { challengeId_userId: { challengeId, userId: user.id } },
      create: {
        challengeId,
        userId:      user.id,
        status:      "completed",
        completedAt: new Date(),
        mediaUrl,
      } as any,
      update: {
        status:      "completed",
        completedAt: new Date(),
        mediaUrl,
      } as any,
    });

    return NextResponse.json({
      ok: true,
      entry: {
        id:            entry.id,
        status:        entry.status,
        completedAt:   entry.completedAt?.toISOString() ?? null,
        validatedAt:   entry.validatedAt?.toISOString() ?? null,
        note:          entry.note,
        mediaUrl:      (entry as any).mediaUrl,
        answers:       (entry as any).answers ?? null,
        practiceCount: (entry as any).practiceCount ?? 0,
      },
    });
  }

  // ── Simple: mark as completed ──────────────────────────────────────────────
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
      id:            entry.id,
      status:        entry.status,
      completedAt:   entry.completedAt?.toISOString() ?? null,
      validatedAt:   entry.validatedAt?.toISOString() ?? null,
      note:          entry.note,
      mediaUrl:      (entry as any).mediaUrl ?? null,
      answers:       (entry as any).answers ?? null,
      practiceCount: (entry as any).practiceCount ?? 0,
    },
  });
}
