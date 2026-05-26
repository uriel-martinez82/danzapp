/**
 * update-demo-ids.ts
 *
 * Los usuarios Clerk (nuevos IDs) ya existen en la BD (vía webhook).
 * Los usuarios demo (IDs "user-*-demo-*") existen por el seed.
 *
 * Estrategia:
 *  1. Asegurarse de que los usuarios Clerk tengan rol y schoolId correctos.
 *  2. Reasignar todas las FK de los datos demo (clases, pagos, etc.)
 *     para que apunten a los Clerk IDs.
 *  3. Borrar los usuarios demo que ya no tienen referencias.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── IDs ───────────────────────────────────────────────────────────────────────

const SCHOOL_ID = "school-demo-001";

const ADMIN = {
  demoId:   "user-admin-demo-001",
  clerkId:  "user_3EH8QCV2wwKJCsEqsAZWVmMKt78",
  role:     "admin",
  email:    "admin@lumina.com",
};

const TEACHER = {
  demoId:   "user-teacher-demo-001",
  clerkId:  "user_3EH8Yv3EcolURm205NYcaxfWJB2",
  role:     "teacher",
  email:    "profesor@lumina.com",
};

const STUDENT = {
  demoId:   "user-student-demo-001",
  clerkId:  "user_3EH8bSeyuo8ClmqKORFQ3lK2Fxc",
  role:     "student",
  email:    "alumno@lumina.com",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function exec(label: string, sql: string) {
  const rows = await prisma.$executeRawUnsafe(sql);
  console.log(`   ${label}: ${rows} fila(s)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {

  // ── PASO 1: Asegurar rol y schoolId en usuarios Clerk ─────────────────────
  console.log("\n📌 Paso 1: Actualizar usuarios Clerk con rol y schoolId...");

  for (const u of [ADMIN, TEACHER, STUDENT]) {
    const rows = await prisma.$executeRawUnsafe(
      `UPDATE "User"
       SET    role     = '${u.role}',
              "schoolId" = '${SCHOOL_ID}'
       WHERE  id = '${u.clerkId}'`,
    );
    console.log(`   ${u.role} (${u.clerkId}): ${rows} fila(s)`);
  }

  // ── PASO 2: Reasignar FK de datos demo a Clerk IDs ────────────────────────
  console.log("\n🔄 Paso 2: Reasignar FK de datos demo a Clerk IDs...");

  // Admin: autora de los comunicados
  console.log("\n  Admin:");
  await exec(
    "Announcement.authorId",
    `UPDATE "Announcement" SET "authorId" = '${ADMIN.clerkId}' WHERE "authorId" = '${ADMIN.demoId}'`,
  );
  await exec(
    "AnnouncementRead.userId",
    `UPDATE "AnnouncementRead" SET "userId" = '${ADMIN.clerkId}' WHERE "userId" = '${ADMIN.demoId}'`,
  );

  // Profesor: teacherId en clases y evaluaciones
  console.log("\n  Profesor:");
  await exec(
    "Class.teacherId",
    `UPDATE "Class" SET "teacherId" = '${TEACHER.clerkId}' WHERE "teacherId" = '${TEACHER.demoId}'`,
  );
  await exec(
    "Evaluation.teacherId",
    `UPDATE "Evaluation" SET "teacherId" = '${TEACHER.clerkId}' WHERE "teacherId" = '${TEACHER.demoId}'`,
  );
  await exec(
    "AnnouncementRead.userId",
    `UPDATE "AnnouncementRead" SET "userId" = '${TEACHER.clerkId}' WHERE "userId" = '${TEACHER.demoId}'`,
  );

  // Alumno: enrollments, pagos, evaluaciones
  console.log("\n  Alumno:");
  await exec(
    "Enrollment.studentId",
    `UPDATE "Enrollment" SET "studentId" = '${STUDENT.clerkId}' WHERE "studentId" = '${STUDENT.demoId}'`,
  );
  await exec(
    "Payment.studentId",
    `UPDATE "Payment" SET "studentId" = '${STUDENT.clerkId}' WHERE "studentId" = '${STUDENT.demoId}'`,
  );
  await exec(
    "Evaluation.studentId",
    `UPDATE "Evaluation" SET "studentId" = '${STUDENT.clerkId}' WHERE "studentId" = '${STUDENT.demoId}'`,
  );
  await exec(
    "AnnouncementRead.userId",
    `UPDATE "AnnouncementRead" SET "userId" = '${STUDENT.clerkId}' WHERE "userId" = '${STUDENT.demoId}'`,
  );

  // ── PASO 3: Eliminar usuarios demo (ya sin referencias) ───────────────────
  console.log("\n🗑️  Paso 3: Eliminar usuarios demo...");

  for (const demoId of [ADMIN.demoId, TEACHER.demoId, STUDENT.demoId]) {
    const rows = await prisma.$executeRawUnsafe(
      `DELETE FROM "User" WHERE id = '${demoId}'`,
    );
    console.log(`   DELETE ${demoId}: ${rows} fila(s)`);
  }

  // ── Verificación final ────────────────────────────────────────────────────
  console.log("\n🔍 Verificación...");
  const users = await prisma.$queryRawUnsafe<{ id: string; role: string; email: string }[]>(
    `SELECT id, role, email FROM "User" WHERE "schoolId" = '${SCHOOL_ID}' ORDER BY role`,
  );
  for (const u of users) {
    console.log(`   [${u.role}] ${u.id} — ${u.email}`);
  }

  console.log("\n✅ Migración completada.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Error:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
