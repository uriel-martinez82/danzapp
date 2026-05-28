import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/school ───────────────────────────────────────────────────────────

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Sin escuela asignada" }, { status: 403 });

  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school)
    return NextResponse.json({ error: "Escuela no encontrada" }, { status: 404 });

  return NextResponse.json({
    id:          school.id,
    name:        school.name,
    slug:        school.slug,
    logoUrl:     school.logoUrl,
    bannerUrl:   school.bannerUrl,
    accentColor: school.accentColor ?? "#FF3D5E",
  });
}

// ── PATCH /api/school ─────────────────────────────────────────────────────────

type PatchBody = {
  name?:        string;
  logoUrl?:     string;
  bannerUrl?:   string;
  accentColor?: string;
};

export async function PATCH(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Sin escuela asignada" }, { status: 403 });
  if (String(user.role) !== "admin")
    return NextResponse.json({ error: "Solo el admin puede editar la escuela" }, { status: 403 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { name, logoUrl, bannerUrl, accentColor } = body;

  // Validaciones básicas
  if (name !== undefined && !name.trim())
    return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });

  if (accentColor !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(accentColor))
    return NextResponse.json({ error: "Color inválido (hex de 6 dígitos)" }, { status: 400 });

  const data: Record<string, string> = {};
  if (name        !== undefined) data.name        = name.trim();
  if (logoUrl     !== undefined) data.logoUrl     = logoUrl;
  if (bannerUrl   !== undefined) data.bannerUrl   = bannerUrl;
  if (accentColor !== undefined) data.accentColor = accentColor;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

  const updated = await prisma.school.update({
    where: { id: user.schoolId },
    data,
  });

  return NextResponse.json({
    id:          updated.id,
    name:        updated.name,
    slug:        updated.slug,
    logoUrl:     updated.logoUrl,
    bannerUrl:   updated.bannerUrl,
    accentColor: updated.accentColor ?? "#FF3D5E",
  });
}
