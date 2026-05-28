import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── POST /api/school/upload ───────────────────────────────────────────────────
// Query param: ?type=banner | ?type=logo

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user || !user.schoolId)
    return NextResponse.json({ error: "Sin escuela asignada" }, { status: 403 });
  if (String(user.role) !== "admin")
    return NextResponse.json({ error: "Solo el admin puede subir imágenes" }, { status: 403 });

  const uploadType = req.nextUrl.searchParams.get("type") ?? "banner";
  if (uploadType !== "banner" && uploadType !== "logo")
    return NextResponse.json({ error: "Tipo inválido (banner | logo)" }, { status: 400 });

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

  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimes.includes(file.type))
    return NextResponse.json({ error: "Solo se aceptan JPG, PNG y WEBP" }, { status: 400 });

  // Máx 3 MB
  if (file.size > 3 * 1024 * 1024)
    return NextResponse.json({ error: "La imagen no puede superar los 3 MB" }, { status: 400 });

  // ── Convertir y subir a Cloudinary ────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);

  type CloudinaryResult = { secure_url: string };

  const isBanner = uploadType === "banner";

  let result: CloudinaryResult;
  try {
    result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder:     "pasada/schools",
            public_id:  `${uploadType}_${user.schoolId}`,
            overwrite:  true,
            invalidate: true,
            transformation: isBanner
              ? [{ width: 1600, height: 400, crop: "fill", gravity: "auto" }]
              : [{ width: 200,  height: 200, crop: "fill", gravity: "center" }],
          },
          (error, res) => {
            if (error || !res) reject(error ?? new Error("Sin resultado"));
            else resolve(res as CloudinaryResult);
          },
        )
        .end(buffer);
    });
  } catch (err) {
    console.error("[school/upload] Cloudinary error:", err);
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
  }

  // ── Guardar URL en la escuela ─────────────────────────────────────────────
  const field = isBanner ? "bannerUrl" : "logoUrl";
  await prisma.school.update({
    where: { id: user.schoolId },
    data:  { [field]: result.secure_url },
  });

  return NextResponse.json({ url: result.secure_url, type: uploadType });
}
