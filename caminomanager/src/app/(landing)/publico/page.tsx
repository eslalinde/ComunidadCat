import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const SECURITY_POINTS: Array<{ title: string; description: string }> = [
  {
    title: "Acceso solo por invitación",
    description:
      "Crear una cuenta no da acceso a ninguna información. Un responsable debe asignar a cada persona su rol y las comunidades, parroquias o zonas que le corresponden.",
  },
  {
    title: "Correo verificado",
    description:
      "Cada cuenta se confirma desde el correo de la persona antes de poder usarse.",
  },
  {
    title: "Cada usuario ve solo lo suyo",
    description:
      "Los permisos se validan en la base de datos, no solo en la pantalla: nadie puede consultar ni modificar información fuera de su alcance.",
  },
  {
    title: "Datos de contacto cifrados",
    description:
      "Los teléfonos de los hermanos se guardan cifrados y solo se muestran a quien tiene permiso.",
  },
  {
    title: "Registro de cambios",
    description:
      "Las modificaciones quedan registradas en un historial que no se puede alterar ni borrar.",
  },
  {
    title: "Buen uso de la información",
    description:
      "Los datos pertenecen a los hermanos y a sus comunidades. Úsalos solo para el servicio, no compartas tu cuenta y avisa a tu responsable si detectas algo extraño.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href={routes.publico} aria-label="ComunidadCat, inicio">
            <BrandLogo size="sm" />
          </Link>
          <Link href={routes.login} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Iniciar sesión
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <section>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Gestión de comunidades, gratuita y por invitación
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            ComunidadCat es un software gratuito para organizar parroquias, comunidades, hermanos y
            equipos. Inicialmente está pensado para las comunidades del Camino Neocatecumenal y el
            acceso se otorga únicamente por invitación.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={routes.login} className={buttonVariants({ size: "lg" })}>
              Iniciar sesión
            </Link>
            <Link
              href={routes.signup}
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              Recibí una invitación, crear mi cuenta
            </Link>
          </div>
        </section>

        <section aria-labelledby="seguridad" className="mt-16 border-t pt-12">
          <h2 id="seguridad" className="text-2xl font-semibold tracking-tight">
            Seguridad
          </h2>
          <p className="mt-3 text-muted-foreground">
            La plataforma maneja información personal de los hermanos, por eso cuidamos quién entra y
            qué puede ver.
          </p>
          <ul className="mt-8 space-y-6">
            {SECURITY_POINTS.map((point) => (
              <li key={point.title}>
                <h3 className="font-semibold">{point.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
