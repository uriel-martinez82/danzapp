import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium">Hola, {user.firstName || user.email}</h1>
      <p className="text-gray-500 mt-1">Rol: {user.role}</p>
    </div>
  );
}