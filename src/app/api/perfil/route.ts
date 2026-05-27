import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/perfil ───────────────────────────────────────────────────────────

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      email:     true,
      phone:     true,
      birthDate: true,
      role:      true,
      schoolId:  true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({
    ...user,
    birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
    createdAt: user.createdAt.toISOString(),
  });
}

// ── PATCH /api/perfil ─────────────────────────────────────────────────────────

type PatchBody = {
  firstName?: string;
  lastName?:  string;
  phone?:     string;
  birthDate?: string | null;
};

export async function PATCH(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { firstName, lastName, phone, birthDate } = body;

  // Validaciones básicas
  if (firstName !== undefined && firstName.trim() === "")
    return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
  if (lastName !== undefined && lastName.trim() === "")
    return NextResponse.json({ error: "El apellido no puede estar vacío" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: clerkUser.id },
    data: {
      ...(firstName  !== undefined ? { firstName: firstName.trim() }  : {}),
      ...(lastName   !== undefined ? { lastName:  lastName.trim() }   : {}),
      ...(phone      !== undefined ? { phone:     phone.trim() || null } : {}),
      ...(birthDate  !== undefined
        ? { birthDate: birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null }
        : {}),
    },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      email:     true,
      phone:     true,
      birthDate: true,
      role:      true,
      schoolId:  true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ...updated,
    birthDate: updated.birthDate ? updated.birthDate.toISOString().split("T")[0] : null,
    createdAt: updated.createdAt.toISOString(),
  });
}
