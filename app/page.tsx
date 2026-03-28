import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { WaveDivider, BlobDecoration, GridPattern, RegistroIcon, AsesorIcon, DesarrolloIcon, SustentacionIcon, SectionAccent } from "@/components/decorative-svgs";
const LottieBook = dynamic(() => import("@/components/lottie-book").then(m => ({ default: m.LottieBook })));
const LottieCta = dynamic(() => import("@/components/lottie-book").then(m => ({ default: m.LottieCta })));
import { LandingHeader } from "@/components/layout/landing-header";
import {
  HeroGraduados,
  PeepMaria, PeepJuan, PeepLuis,
  PeepThinking,
  PeepRegistro, PeepAsesor, PeepInvestigador, PeepGraduado,
} from "@/components/peep-characters";
import {
  GraduationCap,
  FileText,
  Users,
  Calendar,
  CheckCircle,
  ArrowRight,
  ClipboardList,
  BarChart3,
  Quote,
  Shield,
  Clock,
  Award,
  BookOpen,
  Target,
  Star,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

const GsapLanding = dynamic(() => import("@/components/gsap-landing").then(m => ({ default: m.GsapLanding })));
const GradientMesh = dynamic(() => import("@/components/gradient-mesh").then(m => ({ default: m.GradientMesh })));
const Spotlight = dynamic(() => import("@/components/ui/spotlight").then(m => ({ default: m.Spotlight })));
const BackgroundBeams = dynamic(() => import("@/components/ui/background-beams").then(m => ({ default: m.BackgroundBeams })));
const InfiniteMovingCards = dynamic(() => import("@/components/ui/infinite-moving-cards").then(m => ({ default: m.InfiniteMovingCards })));

export const metadata: Metadata = {
  title: "Sistema de Seguimiento de Tesis - UNAMAD",
  description: "Plataforma integral para la gestión y seguimiento de tesis universitarias de la Universidad Nacional Amazónica de Madre de Dios.",
  openGraph: {
    title: "Sistema de Seguimiento de Tesis - UNAMAD",
    description: "Gestiona, supervisa y da seguimiento al progreso de tesis de pregrado y posgrado.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-background bg-grid overflow-x-hidden">
      {/* Header */}
      <LandingHeader />

      <main id="main-content">
        {/* ═══════════════════════════════════════════════ */}
        {/* HERO SECTION                                    */}
        {/* ═══════════════════════════════════════════════ */}
        <section data-gsap="hero" className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col noise-overlay">
          <Spotlight fill="var(--primary)" />
          <div data-gsap="hero-blob" data-speed="0.6" className="absolute -bottom-40 -left-40 w-[500px] h-[500px]">
            <BlobDecoration className="w-full h-full opacity-40 rotate-180" />
          </div>
          <div data-gsap="hero-grid" className="absolute inset-0">
            <GridPattern className="w-full h-full opacity-40" />
          </div>

          {/* Floating accent orbs */}
          <div className="absolute top-1/4 right-[15%] w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-1/3 left-[10%] w-56 h-56 bg-primary/3 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite_2s]" />

          <div className="container mx-auto px-4 relative z-10 flex-1 flex items-center">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
              <div className="flex flex-col gap-6 lg:gap-8">
                {/* Pill badge */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards">
                  <Badge variant="secondary" className="w-fit px-4 py-1.5 gap-2 border border-primary/10 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    Plataforma de Gestión Académica
                  </Badge>
                </div>

                {/* Title with gradient */}
                <div className="relative">
                  <GradientMesh variant="hero" className="z-0" />
                  <h1 className="font-[family-name:var(--font-syne)] text-[1.75rem] sm:text-4xl md:text-5xl lg:text-[4.25rem] font-bold tracking-tighter leading-[0.92] relative z-10">
                    <div data-gsap="hero-line" className="hero-gradient-text opacity-0">Sistema de</div>
                    <div data-gsap="hero-line" className="text-foreground opacity-0">Seguimiento de</div>
                    <div data-gsap="hero-line" className="hero-gradient-text opacity-0">Tesis Universitarias</div>
                  </h1>
                </div>

                <p className="text-lg lg:text-xl text-muted-foreground max-w-xl animate-in fade-in spin-in-6 zoom-in-95 duration-1000 delay-300 fill-mode-backwards leading-relaxed">
                  Gestiona, supervisa y da seguimiento al progreso de tesis de pregrado y posgrado.
                  Una plataforma integral para tesistas, asesores y revisores.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in duration-1000 delay-500 fill-mode-backwards">
                  <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 w-full sm:w-auto group">
                    <Link href="/login">
                      Iniciar Sesión
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="hover:bg-primary/5 border-primary/20 hover:border-primary/40 transition-all duration-300 w-full sm:w-auto">
                    <Link href="/registrarse">
                      Crear Cuenta Gratis
                    </Link>
                  </Button>
                </div>

                {/* Trust indicators with divider */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 animate-in fade-in duration-1000 delay-700 fill-mode-backwards">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Datos seguros</span>
                  </div>
                  <div className="w-px h-4 bg-border hidden sm:block" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Soporte 24/7</span>
                  </div>
                  <div className="w-px h-4 bg-border hidden sm:block" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
                      <Award className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Certificado</span>
                  </div>
                </div>
              </div>

              {/* Lottie animation with decorative frame */}
              <div data-gsap="hero-lottie" data-speed="0.85" className="hidden lg:flex items-center justify-center animate-in fade-in zoom-in-95 duration-1000 delay-300 fill-mode-backwards">
                <div className="relative">
                  <div className="absolute -inset-8 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 rounded-[2rem] blur-2xl" />
                  <LottieBook className="w-[400px] h-[420px] drop-shadow-2xl relative z-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Graduated Peeps strip */}
          <div className="relative z-10 pointer-events-none">
            <HeroGraduados className="h-12 mx-auto" />
          </div>

          {/* Scroll indicator */}
          <div className="pb-8 flex justify-center relative z-10 animate-in fade-in duration-1000 delay-1000 fill-mode-backwards">
            <a href="#caracteristicas" className="flex flex-col items-center gap-2 text-muted-foreground/60 hover:text-primary transition-colors group">
              <span className="text-xs uppercase tracking-[0.2em] font-medium">Explorar</span>
              <div className="w-5 h-8 rounded-full border-2 border-current flex justify-center pt-1.5 group-hover:border-primary transition-colors">
                <div className="w-1 h-2 rounded-full bg-current animate-bounce" />
              </div>
            </a>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* STATS SECTION                                   */}
        {/* ═══════════════════════════════════════════════ */}
        <section data-gsap="stats" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/80 to-muted/30" />
          <div className="container mx-auto px-4 py-16 lg:py-20 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { icon: BookOpen, value: "500+", label: "Tesis Registradas", delay: 0 },
                { icon: Users, value: "150+", label: "Asesores Activos", delay: 1 },
                { icon: GraduationCap, value: "12", label: "Facultades", delay: 2 },
                { icon: Target, value: "95%", label: "Tasa de Éxito", delay: 3 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  data-gsap="stat-card"
                  className="text-center group gradient-border bg-card p-6 lg:p-8 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:scale-110 transition-all duration-300">
                    <stat.icon className="h-7 w-7 lg:h-8 lg:w-8" />
                  </div>
                  <p data-gsap="stat-number" className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary font-[family-name:var(--font-syne)] tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1.5 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* FEATURES — BENTO GRID                           */}
        {/* ═══════════════════════════════════════════════ */}
        <section id="caracteristicas" className="bg-muted/50 py-24 relative overflow-hidden noise-overlay">
          <div className="container mx-auto px-4 relative z-10">
            <div data-gsap="section-header" className="text-center mb-16">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <Sparkles className="h-3 w-3" />
                Características
              </Badge>
              <h2 className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
                Todo lo que necesitas
              </h2>
              <SectionAccent className="w-28 h-2 mx-auto mb-4" />
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Herramientas diseñadas para gestionar el proceso de tesis de forma eficiente
              </p>
            </div>

            {/* Bento Grid Layout */}
            <div data-gsap="features-grid" className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 auto-rows-fr">
              {/* Card 1 — Featured (spans 2 cols on lg) */}
              <Card data-gsap="feature-card" className="bento-glow group hover:shadow-xl hover:border-primary/30 transition-all duration-500 relative overflow-hidden lg:col-span-2 lg:row-span-1">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-[4rem] group-hover:from-primary/15 transition-all duration-500" />
                <CardHeader className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 shrink-0">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="font-[family-name:var(--font-syne)] text-xl mb-2">Gestión de Documentos</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Sube, organiza y versiona todos los documentos relacionados con tu tesis en un solo lugar.
                      Control de versiones automático, firma digital integrada y descarga en lote.
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 hidden md:block" />
                </CardHeader>
              </Card>

              {/* Card 2 */}
              <Card data-gsap="feature-card" className="bento-glow group hover:shadow-xl hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <Users className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Asignación de Asesores</CardTitle>
                  <CardDescription>
                    Conecta tesistas con asesores especializados según líneas de investigación
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 3 */}
              <Card data-gsap="feature-card" className="bento-glow group hover:shadow-xl hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Cronograma de Actividades</CardTitle>
                  <CardDescription>
                    Planifica y visualiza las etapas del desarrollo de la tesis con alertas automáticas
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 4 */}
              <Card data-gsap="feature-card" className="bento-glow group hover:shadow-xl hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Seguimiento de Avances</CardTitle>
                  <CardDescription>
                    Registra el progreso y recibe retroalimentación continua de tu asesor
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 5 — Featured (spans 2 cols on lg) */}
              <Card data-gsap="feature-card" className="bento-glow group hover:shadow-xl hover:border-primary/30 transition-all duration-500 relative overflow-hidden lg:col-span-2 lg:row-span-1">
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-primary/8 to-transparent rounded-tr-[4rem] group-hover:from-primary/15 transition-all duration-500" />
                <CardHeader className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 shrink-0">
                    <ClipboardList className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="font-[family-name:var(--font-syne)] text-xl mb-2">Evaluaciones y Revisiones</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Gestiona las observaciones y aprobaciones de los jurados con un flujo de trabajo estructurado.
                      Historial completo de revisiones y notificaciones en tiempo real.
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 hidden md:block" />
                </CardHeader>
              </Card>

              {/* Card 6 */}
              <Card data-gsap="feature-card" className="bento-glow group hover:shadow-xl hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <BarChart3 className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Reportes y Estadísticas</CardTitle>
                  <CardDescription>
                    Visualiza métricas y genera reportes detallados del proceso académico
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
          <div data-gsap="wave" className="absolute -bottom-24 left-0 w-full z-10 leading-[0]"><WaveDivider className="w-full h-24 block" flip /></div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* PROCESS SECTION                                 */}
        {/* ═══════════════════════════════════════════════ */}
        <section id="proceso" className="pt-24 pb-24 mt-24 relative overflow-hidden">
          <GridPattern className="absolute inset-0 opacity-30" />
          <div className="container mx-auto px-4 relative z-10">
            <div data-gsap="section-header" className="text-center mb-16">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <Target className="h-3 w-3" />
                Proceso
              </Badge>
              <h2 className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">Proceso de Tesis</h2>
              <SectionAccent className="w-28 h-2 mx-auto mb-4" />
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Acompañamos cada etapa del desarrollo de tu investigación
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
              {[
                { icon: RegistroIcon, title: "Registro del Proyecto", desc: "Inscribe tu tema de tesis y datos del proyecto", peep: PeepRegistro, step: 1, rotate: "group-hover:rotate-3" },
                { icon: AsesorIcon, title: "Asignación de Asesor", desc: "Se asigna un asesor según tu línea de investigación", peep: PeepAsesor, step: 2, rotate: "group-hover:-rotate-3" },
                { icon: DesarrolloIcon, title: "Desarrollo y Seguimiento", desc: "Avanza en tu investigación con supervisión continua", peep: PeepInvestigador, step: 3, rotate: "group-hover:rotate-3" },
                { icon: SustentacionIcon, title: "Sustentación", desc: "Programa y realiza la defensa de tu tesis", peep: PeepGraduado, step: 4, rotate: "group-hover:-rotate-3" },
              ].map((item, i) => (
                <div key={item.step} data-gsap="process-step" className="text-center relative group">
                  <div className="relative mx-auto mb-6">
                    <div data-gsap="process-icon" className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center mx-auto shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 ${item.rotate}`}>
                      <item.icon className="w-12 h-12" />
                    </div>
                    <span data-gsap="process-badge" className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-background border-2 border-primary text-primary text-sm font-bold flex items-center justify-center shadow-sm">
                      {item.step}
                    </span>
                  </div>
                  <div data-gsap="process-text">
                    <h3 className="font-[family-name:var(--font-syne)] font-semibold mb-2 text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{item.desc}</p>
                  </div>
                  <div data-gsap="process-peep"><item.peep className="w-20 h-24 mx-auto opacity-70" /></div>
                  {i < 3 && (
                    <div data-gsap="process-connector" className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/40 to-primary/10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* TESTIMONIALS SECTION                            */}
        {/* ═══════════════════════════════════════════════ */}
        <section id="testimonios" className="bg-muted/50 py-24 mt-24 relative">
          <div data-gsap="wave" className="absolute -top-24 left-0 w-full leading-[0]"><WaveDivider className="w-full h-24 block" /></div>
          <div className="container mx-auto px-4">
            <div data-gsap="section-header" className="text-center mb-16">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <Quote className="h-3 w-3" />
                Testimonios
              </Badge>
              <h2 className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">Lo que dicen nuestros usuarios</h2>
              <SectionAccent className="w-28 h-2 mx-auto mb-4" />
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Experiencias de estudiantes y asesores que usan nuestra plataforma
              </p>
            </div>
            <InfiniteMovingCards speed="slow" pauseOnHover aria-label="Testimonios de usuarios" role="region">
              {[
                {
                  text: "La plataforma me ayudó a organizar todo el proceso de mi tesis. El seguimiento con mi asesor fue mucho más fluido y pude graduarme a tiempo.",
                  name: "María Castillo",
                  role: "Ing. de Sistemas - 2024",
                  peep: PeepMaria,
                },
                {
                  text: "Como asesor, puedo dar seguimiento a múltiples tesistas de forma ordenada. Las notificaciones y el calendario son muy útiles.",
                  name: "Dr. Juan Ríos",
                  role: "Asesor - Fac. Ingeniería",
                  peep: PeepJuan,
                },
                {
                  text: "Excelente sistema para gestionar los documentos y ver el progreso. Recomiendo a todos los estudiantes que inicien su tesis aquí.",
                  name: "Luis Paredes",
                  role: "Administración - 2024",
                  peep: PeepLuis,
                },
              ].map((testimonial) => (
                <Card key={testimonial.name} className="relative hover:shadow-lg transition-all duration-300 w-[min(350px,85vw)] shrink-0 gradient-border">
                  <CardContent className="pt-6">
                    <Quote className="h-8 w-8 text-primary/15 absolute top-4 right-4" />
                    <div className="flex gap-1 mb-4" role="img" aria-label="Calificación: 5 de 5 estrellas">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      &quot;{testimonial.text}&quot;
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                      <div className="w-11 h-11 rounded-full bg-primary/5 border border-primary/10 overflow-hidden shrink-0">
                        <testimonial.peep className="w-full h-full" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </InfiniteMovingCards>
          </div>
          <div data-gsap="wave" className="absolute -bottom-24 left-0 w-full z-10 leading-[0]"><WaveDivider className="w-full h-24 block" flip /></div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* FAQ SECTION                                     */}
        {/* ═══════════════════════════════════════════════ */}
        <section id="faq" className="py-24 mt-24">
          <div className="container mx-auto px-4">
            <div data-gsap="section-header" className="text-center mb-16">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <BookOpen className="h-3 w-3" />
                FAQ
              </Badge>
              <h2 className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">Preguntas Frecuentes</h2>
              <SectionAccent className="w-28 h-2 mx-auto mb-4" />
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Respuestas a las dudas más comunes sobre nuestra plataforma
              </p>
            </div>
            <div data-gsap="faq-content" className="max-w-3xl mx-auto relative">
              <PeepThinking className="hidden lg:block absolute -right-52 top-8 w-40 h-52 opacity-50" />
              <Accordion type="single" collapsible className="w-full">
                {[
                  {
                    value: "item-1",
                    question: "¿Cómo me registro en la plataforma?",
                    answer: "Para registrarte, haz clic en el botón \"Registrarse\" y completa el formulario con tus datos institucionales. Necesitarás tu código de estudiante y correo institucional para verificar tu identidad.",
                  },
                  {
                    value: "item-2",
                    question: "¿Puedo cambiar de asesor durante el proceso?",
                    answer: "Sí, es posible solicitar un cambio de asesor. Deberás presentar una solicitud formal a través de la plataforma, la cual será evaluada por la coordinación de tu facultad.",
                  },
                  {
                    value: "item-3",
                    question: "¿Qué formatos de archivo puedo subir?",
                    answer: "Aceptamos documentos en formato PDF, DOC, DOCX para textos, y JPG, PNG para imágenes. El tamaño máximo por archivo es de 25MB.",
                  },
                  {
                    value: "item-4",
                    question: "¿Cómo puedo ver el avance de mi tesis?",
                    answer: "En tu panel de control encontrarás una barra de progreso y un timeline detallado con todas las etapas de tu tesis. También recibirás notificaciones cuando tu asesor revise tus avances.",
                  },
                  {
                    value: "item-5",
                    question: "¿La plataforma es gratuita?",
                    answer: "Sí, la plataforma es completamente gratuita para todos los estudiantes y docentes de la Universidad Nacional Amazónica de Madre de Dios.",
                  },
                ].map((faq) => (
                  <AccordionItem key={faq.value} data-gsap="faq-item" value={faq.value}>
                    <AccordionTrigger className="text-left hover:text-primary transition-colors">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* CTA SECTION                                     */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="bg-muted/50 py-24 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <Card data-gsap="cta-card" className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground overflow-hidden relative border-0 shadow-2xl shadow-primary/20">
              <BackgroundBeams />
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-12 lg:p-16 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-foreground/15 backdrop-blur-sm">
                      <Zap className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-primary-foreground/80 uppercase tracking-[0.15em]">Empieza ahora</span>
                  </div>
                  <h2 className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                    ¿Listo para comenzar<br className="hidden sm:block" /> tu tesis?
                  </h2>
                  <p className="text-primary-foreground/75 mb-8 max-w-md text-lg">
                    Regístrate y comienza a gestionar tu proyecto de investigación hoy mismo.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild size="lg" variant="secondary" className="shrink-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 gap-2 group">
                      <Link href="/registrarse">
                        Crear Cuenta Gratis
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="ghost" className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 border border-primary-foreground/20">
                      <Link href="/login">
                        Ya tengo cuenta
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="hidden md:block shrink-0">
                  <LottieCta className="w-56 h-48 lg:w-64 lg:h-56" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════ */}
      {/* FOOTER                                          */}
      {/* ═══════════════════════════════════════════════ */}
      <footer className="border-t bg-background relative">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent h-32 pointer-events-none" />
        <div data-gsap="footer" className="container mx-auto px-4 py-12 lg:py-16 relative z-10">
          <div className="grid md:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand column */}
            <div className="md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Image
                  src="/logo/logounamad.png"
                  alt="UNAMAD Logo"
                  width={36}
                  height={36}
                  className="rounded"
                />
                <span className="font-[family-name:var(--font-syne)] font-bold text-lg">Seguimiento de Tesis</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Plataforma integral para la gestión y seguimiento de tesis universitarias de la UNAMAD.
              </p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">v1.0</Badge>
                <Badge variant="outline" className="text-xs">UNAMAD</Badge>
              </div>
            </div>

            {/* Links column */}
            <div>
              <h4 className="font-[family-name:var(--font-syne)] font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Navegación</h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  { href: "#top", label: "Inicio" },
                  { href: "#caracteristicas", label: "Características" },
                  { href: "#proceso", label: "Proceso" },
                  { href: "#testimonios", label: "Testimonios" },
                  { href: "#faq", label: "Preguntas Frecuentes" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group">
                      <ChevronRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick access */}
            <div>
              <h4 className="font-[family-name:var(--font-syne)] font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Acceso Rápido</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group">
                    <ChevronRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    Iniciar Sesión
                  </Link>
                </li>
                <li>
                  <Link href="/registrarse" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group">
                    <ChevronRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    Registrarse
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact column */}
            <div id="contacto">
              <h4 className="font-[family-name:var(--font-syne)] font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Contacto</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="pt-1">Universidad Nacional Amazónica de Madre de Dios</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <a href="mailto:soporte@unamad.edu.pe" className="hover:text-primary transition-colors">soporte@unamad.edu.pe</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <a href="tel:+5182571046" className="hover:text-primary transition-colors">(082) 571-046</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <span>Puerto Maldonado, Perú</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; 2026 Seguimiento de Tesis - UNAMAD. Todos los derechos reservados.</p>
            <div className="flex items-center gap-1.5 text-xs">
              <span>Hecho con</span>
              <span className="text-primary">&#9829;</span>
              <span>en Puerto Maldonado</span>
            </div>
          </div>
        </div>
      </footer>

      <GsapLanding />
    </div>
  );
}
