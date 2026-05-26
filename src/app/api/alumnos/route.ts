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

  const students = await prisma.user.findMany({
    where: { schoolId: user.schoolId, role: "student" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(students);
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

  let body: { firstName?: string; lastName?: string; email?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { firstName, lastName, email, phone } = body;

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Nombre, apellido y email son requeridos" },
      { status: 422 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email" },
      { status: 409 },
    );
  }

  const student = await prisma.user.create({
    data: {
      schoolId: user.schoolId,
      role: "student",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      active: true,
    },
  });

  return NextResponse.json(student, { status: 201 });
}
