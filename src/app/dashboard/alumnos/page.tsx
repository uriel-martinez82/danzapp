import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AlumnosClient from "./AlumnosClient";

export default async function AlumnosPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  });
  if (!user) redirect("/sign-in");

  if (!user.schoolId) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <p
          style={{
            fontFamily: "var(--font-jakarta)",
            fontSize: "14px",
            color: "#999999",
          }}
        >
          No tenés una escuela asignada.
        </p>
      </div>
    );
  }

  const students = await prisma.user.findMany({
    where: { schoolId: user.schoolId, role: "student" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      birthDate: true,
      active: true,
      createdAt: true,
    },
  });

  // Serialize Date objects before passing to Client Component
  const serialized = students.map((s) => ({
    ...s,
    birthDate: s.birthDate?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  return <AlumnosClient students={serialized} />;
}
