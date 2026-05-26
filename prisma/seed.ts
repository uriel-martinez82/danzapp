import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── IDs fijos ─────────────────────────────────────────────────────────────────

const SCHOOL_ID   = "school-demo-001";
const ADMIN_ID    = "user-admin-demo-001";
const TEACHER_ID  = "user-teacher-demo-001";
const STUDENT_ID  = "user-student-demo-001";

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧹 Limpiando base de datos...");

  await prisma.announcementRead.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.classSchedule.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  console.log("🏫 Creando escuela...");

  await prisma.school.create({
    data: {
      id:   SCHOOL_ID,
      name: "Academia de Danza Lumina",
      slug: "lumina",
      plan: "free",
    },
  });

  // ── Usuarios ───────────────────────────────────────────────────────────────

  console.log("👤 Creando usuarios...");

  await prisma.user.create({
    data: {
      id:        ADMIN_ID,
      firstName: "Carolina",
      lastName:  "Vega",
      email:     "admin@lumina.demo",
      role:      "admin",
      schoolId:  SCHOOL_ID,
    },
  });

  await prisma.user.create({
    data: {
      id:        TEACHER_ID,
      firstName: "Marcos",
      lastName:  "Ricci",
      email:     "profesor@lumina.demo",
      role:      "teacher",
      schoolId:  SCHOOL_ID,
    },
  });

  await prisma.user.create({
    data: {
      id:        STUDENT_ID,
      firstName: "Valentina",
      lastName:  "Torres",
      email:     "alumno@lumina.demo",
      role:      "student",
      schoolId:  SCHOOL_ID,
    },
  });

  // ── Clases con horarios ────────────────────────────────────────────────────

  console.log("🎭 Creando clases y horarios...");

  const ballet = await prisma.class.create({
    data: {
      schoolId:  SCHOOL_ID,
      teacherId: TEACHER_ID,
      name:      "Ballet Clásico Nivel I",
      style:     "Ballet",
      level:     "beginner",
      room:      "Sala A",
      capacity:  15,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: "17:00", endTime: "18:30" }, // Lunes
          { dayOfWeek: 3, startTime: "17:00", endTime: "18:30" }, // Miércoles
        ],
      },
    },
  });

  await prisma.class.create({
    data: {
      schoolId:  SCHOOL_ID,
      teacherId: TEACHER_ID,
      name:      "Contemporáneo Avanzado",
      style:     "Contemporáneo",
      level:     "advanced",
      room:      "Sala B",
      capacity:  12,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: "19:00", endTime: "20:30" }, // Martes
          { dayOfWeek: 4, startTime: "19:00", endTime: "20:30" }, // Jueves
        ],
      },
    },
  });

  const jazz = await prisma.class.create({
    data: {
      schoolId:  SCHOOL_ID,
      teacherId: TEACHER_ID,
      name:      "Jazz Intermedio",
      style:     "Jazz",
      level:     "intermediate",
      room:      "Sala A",
      capacity:  20,
      schedules: {
        create: [
          { dayOfWeek: 5, startTime: "18:00", endTime: "19:30" }, // Viernes
        ],
      },
    },
  });

  await prisma.class.create({
    data: {
      schoolId:  SCHOOL_ID,
      teacherId: TEACHER_ID,
      name:      "Folklore y Danzas Regionales",
      style:     "Folklore",
      level:     "all",
      room:      "Salón Principal",
      capacity:  25,
      schedules: {
        create: [
          { dayOfWeek: 6, startTime: "10:00", endTime: "12:00" }, // Sábado
        ],
      },
    },
  });

  // ── Inscripciones ──────────────────────────────────────────────────────────

  console.log("📋 Inscribiendo alumno demo...");

  await prisma.enrollment.create({
    data: {
      studentId: STUDENT_ID,
      classId:   ballet.id,
      status:    "active",
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: STUDENT_ID,
      classId:   jazz.id,
      status:    "active",
    },
  });

  // ── Pagos ──────────────────────────────────────────────────────────────────

  console.log("💰 Creando pagos...");

  // 1. Cuota Mayo — pagado
  await prisma.payment.create({
    data: {
      schoolId:  SCHOOL_ID,
      studentId: STUDENT_ID,
      concept:   "Cuota Mayo 2026",
      amount:    15000,
      dueDate:   new Date("2026-05-10"),
      paidAt:    new Date(),
      status:    "paid",
      method:    "transfer",
    },
  });

  // 2. Cuota Junio — pendiente (vence en 30 días)
  await prisma.payment.create({
    data: {
      schoolId:  SCHOOL_ID,
      studentId: STUDENT_ID,
      concept:   "Cuota Junio 2026",
      amount:    15000,
      dueDate:   daysFromNow(30),
      status:    "pending",
      method:    null,
    },
  });

  // 3. Material didáctico — vencido (venció hace 15 días)
  await prisma.payment.create({
    data: {
      schoolId:  SCHOOL_ID,
      studentId: STUDENT_ID,
      concept:   "Material didáctico",
      amount:    5000,
      dueDate:   daysFromNow(-15),
      status:    "pending",
      method:    null,
    },
  });

  // ── Comunicados ────────────────────────────────────────────────────────────

  console.log("📢 Creando comunicados...");

  await prisma.announcement.create({
    data: {
      schoolId: SCHOOL_ID,
      authorId: ADMIN_ID,
      title:    "Bienvenidos al segundo semestre",
      body:     "Nos alegra anunciar el inicio del segundo semestre con nuevas clases y horarios actualizados. Este año incorporamos nuevas disciplinas y esperamos verlos a todos con energía renovada.",
      audience: "all",
    },
  });

  await prisma.announcement.create({
    data: {
      schoolId: SCHOOL_ID,
      authorId: ADMIN_ID,
      title:    "Recital de fin de año — fecha confirmada",
      body:     "Ya tenemos fecha confirmada para nuestro recital anual: 15 de diciembre en el Teatro Municipal. Todos los alumnos participarán. Los ensayos generales comenzarán en noviembre.",
      audience: "students",
    },
  });

  await prisma.announcement.create({
    data: {
      schoolId: SCHOOL_ID,
      authorId: ADMIN_ID,
      title:    "Reunión de profesores — jueves 18hs",
      body:     "Convocamos a todos los profesores a una reunión el próximo jueves a las 18hs en la sala de reuniones. Trataremos la planificación del segundo semestre y la organización del recital.",
      audience: "teachers",
    },
  });

  console.log("✅ Seed completado.");
  console.log("   Escuela:      Academia de Danza Lumina (school-demo-001)");
  console.log("   Usuarios:     3 (admin, profesor, alumno)");
  console.log("   Clases:       4 con sus horarios");
  console.log("   Inscripciones: 2 (Ballet + Jazz)");
  console.log("   Pagos:        3 (pagado / pendiente / vencido)");
  console.log("   Comunicados:  3 (all / students / teachers)");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
