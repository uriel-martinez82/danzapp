import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: clerkUser.id },
  });

  if (!user) redirect("/sign-in");

  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-[#0D0D0D]"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          {saludo},{" "}
          {user.firstName || user.email.split("@")[0]}
        </h1>
        <p className="text-[var(--color-gray)] mt-1 text-sm">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {[
          { label: "Alumnos activos", value: "—", icon: "ti-users", change: "" },
          { label: "Clases esta semana", value: "—", icon: "ti-calendar", change: "" },
          { label: "Pagos pendientes", value: "—", icon: "ti-credit-card", change: "" },
          { label: "Comunicados", value: "—", icon: "ti-bell", change: "" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-[#E5E3DD] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--color-gray)] uppercase tracking-wider">
                {stat.label}
              </span>
              <i
                className={`ti ${stat.icon} text-[var(--color-accent)]`}
                style={{ fontSize: 18 }}
                aria-hidden="true"
              />
            </div>
            <div
              className="text-3xl font-bold text-[#0D0D0D]"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-[#E5E3DD] p-6">
          <h2
            className="text-base font-bold text-[#0D0D0D] mb-4"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Últimos comunicados
          </h2>
          <div className="text-sm text-[var(--color-gray)] py-8 text-center">
            No hay comunicados aún
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E3DD] p-6">
          <h2
            className="text-base font-bold text-[#0D0D0D] mb-4"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            Próximas clases
          </h2>
          <div className="text-sm text-[var(--color-gray)] py-8 text-center">
            No hay clases programadas
          </div>
        </div>
      </div>
    </div>
  );
}