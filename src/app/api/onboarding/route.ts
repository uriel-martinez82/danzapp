import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── Slug helpers ──────────────────────────────────────────────────────────────

function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quita diacríticos (á→a, é→e…)
    .replace(/[^a-z0-9\s-]/g, "")      // solo alfanuméricos + espacio + guión
    .trim()
    .replace(/\s+/g, "-")              // espacios → guiones
    .replace(/-+/g, "-")               // colapsa guiones múltiples
    .slice(0, 60);                     // límite razonable
}

async function uniqueSlug(base: string): Promise<string> {
  let slug    = base;
  let counter = 2;
  while (await prisma.school.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar que el usuario existe en nuestra BD
  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Si ya tiene escuela, no permitir crear otra
  if (user.schoolId) {
    return NextResponse.json({ error: "Ya tenés una escuela asignada" }, { status: 409 });
  }

  // Parsear body
  let body: { name?: string; city?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "El nombre de la escuela es requerido" }, { status: 400 });
  }

  const baseSlug = buildSlug(name) || "escuela";
  const slug     = await uniqueSlug(baseSlug);

  // Crear escuela y asignar al usuario en una transacción
  const school = await prisma.school.create({
    data: {
      name,
      slug,
      timezone: "America/Argentina/Buenos_Aires",
      plan:     "free",
    },
  });

  await prisma.user.update({
    where: { id: clerkUser.id },
    data:  { schoolId: school.id, role: "admin" },
  });

  return NextResponse.json({ schoolId: school.id }, { status: 201 });
}
