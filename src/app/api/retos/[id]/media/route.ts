import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── POST /api/retos/[id]/media ────────────────────────────────────────────────
// Accepts an image (max 5 MB) or video (max 50 MB) and uploads to Cloudinary.
// Returns { url } — the caller then passes this to /api/retos/[id]/completar.

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];

type CloudinaryResult = { secure_url: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: clerkUser.id } });
  if (!user)
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (String(user.role) !== "student")
    return NextResponse.json({ error: "Solo los alumnos pueden subir evidencia" }, { status: 403 });

  const { id: challengeId } = await params;

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge)
    return NextResponse.json({ error: "Reto no encontrado" }, { status: 404 });

  if ((challenge as any).type !== "multimedia")
    return NextResponse.json({ error: "Este reto no es de tipo multimedia" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "Se requiere un archivo" }, { status: 400 });

  const mime    = (file as File).type;
  const isImage = IMAGE_TYPES.includes(mime);
  const isVideo = VIDEO_TYPES.includes(mime);

  if (!isImage && !isVideo)
    return NextResponse.json(
      { error: "Solo se admiten imágenes (JPEG, PNG, WebP) o videos (MP4, MOV, WebM)" },
      { status: 400 },
    );

  const arrayBuffer = await (file as File).arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);
  const maxBytes    = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024;

  if (buffer.byteLength > maxBytes)
    return NextResponse.json(
      { error: isImage ? "La imagen no puede superar 5 MB" : "El video no puede superar 50 MB" },
      { status: 400 },
    );

  let result: CloudinaryResult;
  try {
    result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder:        "pasada/challenges",
            public_id:     `challenge_${challengeId}_user_${user.id}_${Date.now()}`,
            resource_type: isImage ? "image" : "video",
            overwrite:     true,
            ...(isImage && {
              transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto:good" }],
            }),
          },
          (error, res) => {
            if (error || !res) reject(error ?? new Error("Sin resultado de Cloudinary"));
            else resolve(res as CloudinaryResult);
          },
        )
        .end(buffer);
    });
  } catch (err) {
    console.error("[retos/media] Cloudinary error:", err);
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
  }

  return NextResponse.json({ url: result.secure_url });
}
