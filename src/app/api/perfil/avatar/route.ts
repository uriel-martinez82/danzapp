import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── POST /api/perfil/avatar ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // ── Leer FormData ──────────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "No se recibió ninguna imagen" }, { status: 400 });

  // Validar tipo MIME
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });

  // Validar tamaño (máx. 5 MB)
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "La imagen no puede superar los 5 MB" }, { status: 400 });

  // ── Convertir a Buffer y subir a Cloudinary ────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  type CloudinaryResult = { secure_url: string; public_id: string };

  let result: CloudinaryResult;
  try {
    result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder:         "pasada/avatars",
            transformation: [{ width: 200, height: 200, crop: "fill", gravity: "face" }],
            public_id:      `avatar_${user.id}`,   // sobreescribe la foto anterior
            overwrite:      true,
            invalidate:     true,
          },
          (error, res) => {
            if (error || !res) reject(error ?? new Error("Sin resultado"));
            else resolve(res as CloudinaryResult);
          },
        )
        .end(buffer);
    });
  } catch (err) {
    console.error("[avatar/route] Cloudinary error:", err);
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
  }

  // ── Actualizar avatarUrl en Prisma ─────────────────────────────────────────
  await prisma.user.update({
    where: { id: user.id },
    data:  { avatarUrl: result.secure_url },
  });

  return NextResponse.json({ avatarUrl: result.secure_url });
}
