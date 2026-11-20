import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Church,
  Footprints,
  HeartHandshake,
  KeyRound,
  Laptop,
  MailCheck,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { StainedGlassRose } from "@/components/landing/StainedGlassRose";
import { routes } from "@/lib/routes";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  pane: string;
}

const FEATURES: Feature[] = [
  {
    title: "Comunidades vivas",
    description:
      "Cada comunidad con su parroquia, sus hermanos, su equipo y la etapa del Camino en la que se encuentra.",
    icon: Users2,
    pane: "bg-vitral-orange",
  },
  {
    title: "Parroquias y diócesis",
    description:
      "Organiza la estructura completa: diócesis, parroquias y las comunidades que nacen en cada una.",
    icon: Church,
    pane: "bg-vitral-blue",
  },
  {
    title: "Hermanos y matrimonios",
    description:
      "Registra personas, cónyuges y carismas: casados, solteros, presbíteros, seminaristas, religiosas e itinerantes.",
    icon: HeartHandshake,
    pane: "bg-vitral-red",
  },
  {
    title: "Etapas del Camino",
    description:
      "Sigue el paso de cada comunidad, desde el Precatecumenado hasta la Renovación de las Promesas Bautismales.",
    icon: Footprints,
    pane: "bg-vitral-green",
  },
  {
    title: "Reportes listos para imprimir",
    description:
      "Equipos de catequistas, presbíteros, responsables y estado de pasos: filtra, ordena e imprime en segundos.",
    icon: BarChart3,
    pane: "bg-vitral-amber",
  },
  {
    title: "Ubicaciones y zonas",
    description:
      "Países, departamentos, ciudades y zonas para saber dónde está cada comunidad y cada itinerante.",
    icon: MapPinned,
    pane: "bg-vitral-sky",
  },
  {
    title: "Permisos por rol",
    description:
      "Cada usuario ve solo lo que le corresponde: responsables, catequistas de zona o equipo nacional.",
    icon: ShieldCheck,
    pane: "bg-vitral-navy",
  },
  {
    title: "En la web y en tu escritorio",
    description:
      "Úsala desde el navegador o instálala en Windows, con actualizaciones automáticas.",
    icon: Laptop,
    pane: "bg-vitral-yellow",
  },
];

const HIERARCHY = [
  { label: "País", pane: "bg-vitral-blue" },
  { label: "Diócesis", pane: "bg-vitral-sky" },
  { label: "Parroquia", pane: "bg-vitral-green" },
  { label: "Comunidad", pane: "bg-vitral-amber" },
  { label: "Hermanos", pane: "bg-vitral-orange" },
  { label: "Equipos", pane: "bg-vitral-red" },
];

const STEPS = [
  "Precatecumenado",
  "1º Escrutinio Bautismal",
  "Shemá Israel",
  "2º Escrutinio Bautismal",
  "1ª Iniciación a la Oración",
  "Traditio Symboli",
  "Retraditio Symboli",
  "Redditio Symboli",
  "Padrenuestro",
  "3º Escrutinio Bautismal",
  "Renovación de Promesas",
];

const STEP_COLORS = [
  "bg-vitral-red",
  "bg-vitral-orange",
  "bg-vitral-amber",
  "bg-vitral-yellow",
  "bg-vitral-green",
  "bg-vitral-sky",
  "bg-vitral-blue",
  "bg-vitral-navy",
  "bg-vitral-sky",
  "bg-vitral-green",
  "bg-vitral-amber",
];

const ACCESS_STEPS: Array<{ title: string; description: string; icon: LucideIcon; pane: string }> = [
  {
    title: "Crea tu cuenta",
    description: "Regístrate con tu correo y una contraseña segura.",
    icon: UserPlus,
    pane: "bg-vitral-amber",
  },
  {
    title: "Confirma tu correo",
    description: "Abre el enlace que te enviamos para verificar que la cuenta es tuya.",
    icon: MailCheck,
    pane: "bg-vitral-sky",
  },
  {
    title: "Recibe tu rol",
    description:
      "Un administrador te asigna el rol y el alcance que te corresponde: comunidad, zona o equipo nacional.",
    icon: KeyRound,
    pane: "bg-vitral-navy",
  },
];

const DARK_PANES =new Set(["bg-vitral-blue", "bg-vitral-navy", "bg-vitral-red", "bg-vitral-green"]);

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/logo.png" alt="" width={36} height={36} priority />
      <span className="font-[family-name:var(--font-montserrat)] text-xl text-vitral-navy">
        Comunidad<span className="font-semibold">Cat</span>
      </span>
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-vitral-paper text-vitral-ink selection:bg-vitral-yellow">
      {/* ------------------------------------------------------------ Nav */}
      <header className="sticky top-0 z-40 border-b-2 border-vitral-ink/10 bg-vitral-paper/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={routes.publico} aria-label="ComunidadCat, inicio">
            <Wordmark />
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-vitral-ink/70 md:flex">
            <a href="#funciones" className="hover:text-vitral-ink">Funciones</a>
            <a href="#estructura" className="hover:text-vitral-ink">Estructura</a>
            <a href="#etapas" className="hover:text-vitral-ink">Etapas</a>
            <a href="#acceso" className="hover:text-vitral-ink">Acceso</a>
          </div>
          <Link
            href={routes.login}
            className="inline-flex min-h-10 items-center rounded-full border-2 border-vitral-ink px-5 text-sm font-semibold transition-colors hover:bg-vitral-ink hover:text-white"
          >
            Iniciar sesión
          </Link>
        </nav>
      </header>

      <main>
        {/* ------------------------------------------------------------ Hero */}
        <section className="relative">
          {/* Light spilling through the glass onto the floor */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-32 top-10 size-[28rem] rounded-full bg-vitral-sky/25 blur-3xl" />
            <div className="absolute right-0 top-40 size-[30rem] rounded-full bg-vitral-amber/25 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 size-[22rem] rounded-full bg-vitral-red/15 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
            <div className="vitral-rise">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-vitral-ink bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]">
                <Sparkles className="size-3.5 text-vitral-orange" aria-hidden />
                Para el Camino Neocatecumenal
              </p>
              <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Cada comunidad,{" "}
                <span className="relative whitespace-nowrap italic text-vitral-blue">
                  una pieza
                  <svg
                    aria-hidden
                    viewBox="0 0 300 16"
                    className="absolute -bottom-2 left-0 h-3 w-full"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 11 C 80 2, 200 2, 298 9"
                      fill="none"
                      stroke="var(--color-vitral-amber)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                del vitral.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-vitral-ink/70">
                ComunidadCat reúne parroquias, comunidades, hermanos y equipos en un solo lugar, para
                que catequistas y responsables dediquen menos tiempo a las hojas de cálculo y más
                tiempo a acompañar.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href={routes.signup}
                  className="group inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-vitral-ink bg-vitral-navy px-6 py-3 font-semibold text-white vitral-pane-shadow transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-vitral-yellow"
                >
                  Crear mi cuenta
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link
                  href={routes.login}
                  className="inline-flex min-h-12 items-center px-2 font-semibold text-vitral-ink underline decoration-vitral-orange decoration-2 underline-offset-4 hover:decoration-vitral-ink"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>

            {/* Rose window with floating app glimpses */}
            <div className="relative mx-auto w-full max-w-[30rem] vitral-rise [animation-delay:150ms]">
              <div className="absolute inset-6 rounded-full bg-vitral-yellow/40 blur-3xl" aria-hidden />
              <StainedGlassRose className="relative drop-shadow-[0_30px_40px_rgba(21,23,28,0.25)]" />

              <div
                aria-hidden
                className="vitral-float absolute -left-2 top-4 w-52 rounded-2xl border-2 border-vitral-ink bg-white p-4 vitral-pane-shadow sm:-left-10 sm:w-56"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-vitral-ink/55">Comunidad</p>
                <p className="font-display text-lg font-semibold">3ª · San José</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-vitral-green/15 px-2.5 py-1 text-xs font-semibold text-[#1f6b24]">
                  <span className="size-2 rounded-full bg-vitral-green" />
                  Shemá Israel
                </span>
              </div>

              <div
                aria-hidden
                className="vitral-float absolute -right-1 bottom-6 w-52 rounded-2xl border-2 border-vitral-ink bg-white p-4 vitral-pane-shadow [animation-delay:-3s] sm:-right-8"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-vitral-ink/55">
                  Equipo de catequistas
                </p>
                <div className="mt-2 flex -space-x-2">
                  {["bg-vitral-red", "bg-vitral-blue", "bg-vitral-amber", "bg-vitral-green"].map((c) => (
                    <span key={c} className={`size-8 rounded-full border-2 border-white ${c}`} />
                  ))}
                </div>
                <p className="mt-2 text-sm text-vitral-ink/70">2 matrimonios · 1 presbítero</p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- Glass ribbon */}
        <div aria-hidden className="flex h-5 border-y-[3px] border-vitral-ink">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className={`flex-1 border-r-[3px] border-vitral-ink last:border-r-0 ${STEP_COLORS[i % STEP_COLORS.length]}`}
            />
          ))}
        </div>

        {/* ------------------------------------------------------- Features */}
        <section id="funciones" className="scroll-mt-20 bg-vitral-cream/60 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b4530c]">Funciones</p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Todo lo que el servicio necesita, ordenado con cariño.
              </h2>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                const iconText = DARK_PANES.has(feature.pane) ? "text-white" : "text-vitral-ink";
                return (
                  <article
                    key={feature.title}
                    className="group relative overflow-hidden rounded-2xl border-2 border-vitral-ink bg-white p-6 vitral-pane-shadow transition-transform hover:-translate-y-1"
                  >
                    <span
                      aria-hidden
                      className={`absolute -right-7 -top-7 size-20 rotate-12 rounded-xl border-2 border-vitral-ink opacity-80 transition-transform duration-500 group-hover:rotate-45 ${feature.pane}`}
                    />
                    <span
                      className={`relative inline-flex size-12 items-center justify-center rounded-xl border-2 border-vitral-ink ${iconText} ${feature.pane}`}
                    >
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <h3 className="relative mt-5 text-lg font-semibold leading-snug">{feature.title}</h3>
                    <p className="relative mt-2 text-sm leading-relaxed text-vitral-ink/70">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ Hierarchy */}
        <section
          id="estructura"
          className="relative scroll-mt-20 overflow-hidden bg-vitral-ink py-24 text-white"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/4 top-0 size-96 rounded-full bg-vitral-blue/30 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-vitral-orange/25 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-vitral-yellow">Estructura</p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Del país a cada hermano, sin perder el hilo.
              </h2>
              <p className="mt-5 text-lg text-white/75">
                Como el plomo que une los vidrios, ComunidadCat mantiene conectada cada pieza de la
                estructura.
              </p>
            </div>

            <ol className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {HIERARCHY.map((level, i) => (
                <li key={level.label}>
                  <div
                    className={`relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-t-full border-[3px] border-black p-4 pt-10 text-vitral-ink shadow-[0_0_50px_-10px_rgba(255,255,255,0.35)] ${level.pane}`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-br from-white/45 via-transparent to-black/20"
                    />
                    <span className="relative self-center font-display text-4xl font-semibold text-black/45">
                      {i + 1}
                    </span>
                    <span className="relative rounded-lg bg-white/90 px-2 py-1 text-center text-sm font-semibold">
                      {level.label}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- Steps */}
        <section id="etapas" className="scroll-mt-20 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2e7d32]">Etapas</p>
                <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                  Acompaña el itinerario, paso a paso.
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-vitral-ink/70">
                  Registra en qué etapa está cada comunidad y consulta de un vistazo el estado de los
                  pasos en toda la zona. La luz entra un vidrio a la vez.
                </p>
              </div>

              <ol className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li
                    key={step}
                    className="flex items-center gap-3 rounded-xl border-2 border-vitral-ink bg-white p-2.5 pr-3"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg border-2 border-vitral-ink text-sm font-bold ${STEP_COLORS[i]} ${
                        DARK_PANES.has(STEP_COLORS[i]) ? "text-white" : "text-vitral-ink"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span lang="es" className="min-w-0 hyphens-auto text-sm font-medium leading-tight">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- Access */}
        <section id="acceso" className="scroll-mt-20 bg-vitral-cream/60 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-vitral-blue">Acceso</p>
              <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Los datos de los hermanos, siempre protegidos.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-vitral-ink/70">
                Crear una cuenta no da acceso a la información. Cada persona ve únicamente las
                comunidades, parroquias o zonas que un administrador le asigna.
              </p>
            </div>

            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {ACCESS_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="relative rounded-2xl border-2 border-vitral-ink bg-white p-6 vitral-pane-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex size-11 items-center justify-center rounded-xl border-2 border-vitral-ink ${step.pane} ${
                          DARK_PANES.has(step.pane) ? "text-white" : "text-vitral-ink"
                        }`}
                      >
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="text-sm font-semibold uppercase tracking-wider text-vitral-ink/55">
                        Paso {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold leading-snug">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-vitral-ink/70">{step.description}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------ Final CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border-2 border-vitral-ink bg-vitral-navy px-6 py-16 text-white vitral-pane-shadow sm:px-14">
            <StainedGlassRose className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] opacity-90 sm:-right-24 sm:-top-24 sm:bottom-auto" />
            <div className="relative max-w-xl">
              <h2 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Deja que la luz pase por cada comunidad.
              </h2>
              <p className="mt-5 text-lg text-white/80">
                Crea tu cuenta y pide a tu responsable que te asigne el acceso que te corresponde.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href={routes.signup}
                  className="group inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-vitral-ink bg-vitral-yellow px-6 py-3 font-semibold text-vitral-ink shadow-[5px_5px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                >
                  Comenzar ahora
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link
                  href={routes.login}
                  className="inline-flex min-h-12 items-center px-2 font-semibold underline decoration-vitral-yellow decoration-2 underline-offset-4"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-vitral-ink/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-vitral-ink/60 sm:flex-row sm:px-6">
          <Wordmark />
          <p>Hecho con cariño para el servicio de las comunidades.</p>
        </div>
      </footer>
    </div>
  );
}
