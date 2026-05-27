import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const VALID_ROLES = new Set(["student", "teacher", "admin"]);

// ── PATCH /api/usuarios/[id]/rol ──────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!admin)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (String(admin.role) !== "admin")
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { id: targetId } = await params;

  // No puede cambiarse el rol a sí mismo
  if (targetId === admin.id)
    return NextResponse.json(
      { error: "No podés cambiar tu propio rol" },
      { status: 400 },
    );

  let body: { role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { role } = body;
  if (!role || !VALID_ROLES.has(role))
    return NextResponse.json(
      { error: "Rol inválido. Valores permitidos: student, teacher, admin" },
      { status: 400 },
    );

  // Verificar que el target pertenece a la misma escuela
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.schoolId !== admin.schoolId)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: targetId },
    data:  { role },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      email:     true,
      role:      true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
}
