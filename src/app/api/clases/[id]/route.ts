import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ── GET /api/clases/[id] ──────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const { id } = await params;

  const clase = await prisma.class.findUnique({
    where: { id },
    include: {
      teacher:   { select: { id: true, firstName: true, lastName: true, email: true } },
      schedules: { orderBy: { dayOfWeek: "asc" } },
      enrollments: {
        where:   { status: "active" },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { student: { lastName: "asc" } },
      },
    },
  });

  if (!clase || clase.schoolId !== user.schoolId)
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });

  // Control de acceso
  const role = String(user.role);
  if (role === "teacher" && clase.teacherId !== user.id)
    return NextResponse.json({ error: "Sin acceso a esta clase" }, { status: 403 });
  if (role === "student") {
    const enrolled = clase.enrollments.some((e) => e.student.id === user.id);
    if (!enrolled)
      return NextResponse.json({ error: "No inscripto en esta clase" }, { status: 403 });
  }

  return NextResponse.json(clase);
}
