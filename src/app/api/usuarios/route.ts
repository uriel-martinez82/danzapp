import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  // Para el módulo de gestión de roles solo el admin puede listar todos
  // Para otros usos internos (p.ej. form de pagos) se permite filtrar por role
  const roleFilter  = req.nextUrl.searchParams.get("role") ?? undefined;
  const adminOnly   = req.nextUrl.searchParams.get("admin") === "true";

  if (adminOnly && String(user.role) !== "admin")
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: {
      schoolId: user.schoolId,
      active:   true,
      ...(roleFilter ? { role: roleFilter } : {}),
    },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      email:     true,
      role:      true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(
    users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
  );
}
