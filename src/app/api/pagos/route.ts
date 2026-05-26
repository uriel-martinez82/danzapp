import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payments = await prisma.payment.findMany({
    where: { schoolId: user.schoolId },
    orderBy: { dueDate: "desc" },
    include: {
      student: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    studentId?: string;
    concept?: string;
    amount?: number | string;
    dueDate?: string;
    method?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { studentId, concept, amount, dueDate, method } = body;

  if (!studentId)
    return NextResponse.json({ error: "El alumno es requerido" }, { status: 400 });
  if (!concept?.trim())
    return NextResponse.json({ error: "El concepto es requerido" }, { status: 400 });
  if (!amount || Number(amount) <= 0)
    return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
  if (!dueDate)
    return NextResponse.json({ error: "La fecha de vencimiento es requerida" }, { status: 400 });

  // Verify student belongs to same school
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 400 });

  const payment = await prisma.payment.create({
    data: {
      schoolId: user.schoolId!,
      studentId,
      concept: concept.trim(),
      amount: Number(amount),
      dueDate: new Date(dueDate),
      method: method?.trim() || null,
      status: "pending",
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
