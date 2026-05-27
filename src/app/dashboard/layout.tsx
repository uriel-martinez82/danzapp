import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Sin escuela asignada → flujo de onboarding
  if (!user.schoolId) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto" style={{ padding: "40px 48px", transition: "background 0.3s ease" }}>
        {children}
      </main>
    </div>
  );
}