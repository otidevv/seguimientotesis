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
import { LottieBook, LottieCta } from "@/components/lottie-book";
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
  Sparkles
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { GsapLanding } from "@/components/gsap-landing";
import { GradientMesh } from "@/components/gradient-mesh";
import { SmoothScrollWrapper } from "@/components/smooth-scroll-wrapper";
import { Spotlight } from "@/components/ui/spotlight";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";

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

      <SmoothScrollWrapper>
      <main id="main-content">
        {/* Hero Section */}
        <section data-gsap="hero" className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col">
          {/* Aceternity Spotlight — follows mouse */}
          <Spotlight fill="var(--primary)" />
          {/* Background decorations */}
          <div data-gsap="hero-blob" data-speed="0.6" className="absolute -bottom-40 -left-40 w-[500px] h-[500px]">
            <BlobDecoration className="w-full h-full opacity-40 rotate-180" />
          </div>
          <div data-gsap="hero-grid" className="absolute inset-0">
            <GridPattern className="w-full h-full opacity-40" />
          </div>

          <div className="container mx-auto px-4 relative z-10 flex-1 flex items-center">
            <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
              <div className="flex flex-col gap-8">
                <Badge variant="secondary" className="w-fit px-4 py-1 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards">
                  Plataforma de Gestión Académica
                </Badge>
                <div className="relative">
                  <GradientMesh variant="hero" className="z-0" />
                  <h1 data-gsap="hero-title" className="font-[family-name:var(--font-syne)] text-[1.75rem] sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter leading-[0.95] opacity-0 relative z-10">
                    Sistema de Seguimiento de Tesis Universitarias
                  </h1>
                </div>
                <p className="text-xl text-muted-foreground max-w-xl animate-in fade-in spin-in-6 zoom-in-95 duration-1000 delay-300 fill-mode-backwards">
                  Gestiona, supervisa y da seguimiento al progreso de tesis de pregrado y posgrado.
                  Una plataforma integral para tesistas, asesores y revisores.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in duration-1000 delay-500 fill-mode-backwards">
                  <Button asChild size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow duration-300 w-full sm:w-auto">
                    <Link href="/login">
                      Iniciar Sesión <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="hover:bg-primary/5 transition-[box-shadow,background-color] duration-300 w-full sm:w-auto">
                    <Link href="/registrarse">
                      Registrarse
                    </Link>
                  </Button>
                </div>
                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 animate-in fade-in duration-1000 delay-700 fill-mode-backwards">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Datos seguros</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Soporte 24/7</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="h-4 w-4 text-primary" />
                    <span>Certificado</span>
                  </div>
                </div>
              </div>
              {/* Lottie animation */}
              <div data-gsap="hero-lottie" data-speed="0.85" className="hidden lg:flex items-center justify-center animate-in fade-in zoom-in-95 duration-1000 delay-300 fill-mode-backwards">
                <LottieBook className="w-[380px] h-[400px] drop-shadow-2xl" />
              </div>
            </div>
          </div>

          {/* Graduated Peeps strip at bottom of hero */}
          <div className="relative z-10 pointer-events-none">
            <HeroGraduados className="h-12 mx-auto" />
          </div>

          {/* Scroll indicator */}
          <div className="pb-8 flex justify-center relative z-10 animate-in fade-in duration-1000 delay-1000 fill-mode-backwards">
            <a href="#caracteristicas" className="flex flex-col items-center gap-2 text-muted-foreground/60 hover:text-primary transition-colors">
              <span className="text-xs uppercase tracking-widest">Explorar</span>
              <div className="w-5 h-8 rounded-full border-2 border-current flex justify-center pt-1.5">
                <div className="w-1 h-2 rounded-full bg-current animate-bounce" />
              </div>
            </a>
          </div>
        </section>

        {/* Stats Section */}
        <section data-gsap="stats" className="bg-muted/50 relative">
          <div className="container mx-auto px-4 py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              <div data-gsap="stat-card" className="text-center group bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/20 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <p data-gsap="stat-number" className="text-3xl md:text-4xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground mt-1">Tesis Registradas</p>
              </div>
              <div data-gsap="stat-card" className="text-center group bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/20 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <p data-gsap="stat-number" className="text-3xl md:text-4xl font-bold text-primary">150+</p>
                <p className="text-sm text-muted-foreground mt-1">Asesores Activos</p>
              </div>
              <div data-gsap="stat-card" className="text-center group bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/20 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <p data-gsap="stat-number" className="text-3xl md:text-4xl font-bold text-primary">12</p>
                <p className="text-sm text-muted-foreground mt-1">Facultades</p>
              </div>
              <div data-gsap="stat-card" className="text-center group bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/20 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <p data-gsap="stat-number" className="text-3xl md:text-4xl font-bold text-primary">95%</p>
                <p className="text-sm text-muted-foreground mt-1">Tasa de Éxito</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="caracteristicas" className="bg-muted/50 py-24 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div data-gsap="section-header" className="text-center mb-16">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <Sparkles className="h-3 w-3" />
                Características
              </Badge>
              <h2 className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl font-bold mb-3">Todo lo que necesitas</h2>
              <SectionAccent className="w-28 h-2 mx-auto mb-4" />
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Herramientas diseñadas para gestionar el proceso de tesis de forma eficiente
              </p>
            </div>
            <div data-gsap="features-grid" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card data-gsap="feature-card" className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <FileText className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Gestión de Documentos</CardTitle>
                  <CardDescription>
                    Sube y organiza todos los documentos relacionados con tu tesis en un solo lugar
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card data-gsap="feature-card" className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <Users className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Asignación de Asesores</CardTitle>
                  <CardDescription>
                    Conecta tesistas con asesores especializados según líneas de investigación
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card data-gsap="feature-card" className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Cronograma de Actividades</CardTitle>
                  <CardDescription>
                    Planifica y visualiza las etapas del desarrollo de la tesis
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card data-gsap="feature-card" className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Seguimiento de Avances</CardTitle>
                  <CardDescription>
                    Registra el progreso y recibe retroalimentación de tu asesor
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card data-gsap="feature-card" className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <ClipboardList className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Evaluaciones y Revisiones</CardTitle>
                  <CardDescription>
                    Gestiona las observaciones y aprobaciones de los jurados
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card data-gsap="feature-card" className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                <CardHeader className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <BarChart3 className="h-7 w-7" />
                  </div>
                  <CardTitle className="font-[family-name:var(--font-syne)]">Reportes y Estadísticas</CardTitle>
                  <CardDescription>
                    Visualiza métricas y genera reportes del proceso académico
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
          <div data-gsap="wave" className="absolute -bottom-24 left-0 w-full z-10 leading-[0]"><WaveDivider className="w-full h-24 block" flip /></div>
        </section>

        {/* Process Section */}
        <section id="proceso" className="pt-24 pb-24 mt-24 relative overflow-hidden">
          <GridPattern className="absolute inset-0 opacity-30" />
          <div className="container mx-auto px-4 relative z-10">
            <div data-gsap="section-header" className="text-center mb-16">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <Target className="h-3 w-3" />
                Proceso
              </Badge>
              <h2 className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl font-bold mb-3">Proceso de Tesis</h2>
              <SectionAccent className="w-28 h-2 mx-auto mb-4" />
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Acompañamos cada etapa del desarrollo de tu investigación
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div data-gsap="process-step" className="text-center relative group">
                <div className="relative mx-auto mb-6">
                  <div data-gsap="process-icon" className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center mx-auto shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 group-hover:rotate-3">
                    <RegistroIcon className="w-12 h-12" />
                  </div>
                  <span data-gsap="process-badge" className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-background border-2 border-primary text-primary text-sm font-bold flex items-center justify-center shadow-sm">1</span>
                </div>
                <div data-gsap="process-text">
                  <h3 className="font-[family-name:var(--font-syne)] font-semibold mb-2 text-lg">Registro del Proyecto</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Inscribe tu tema de tesis y datos del proyecto
                  </p>
                </div>
                <div data-gsap="process-peep"><PeepRegistro className="w-20 h-24 mx-auto opacity-70" /></div>
                <div data-gsap="process-connector" className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/40 to-primary/10" />
              </div>
              <div data-gsap="process-step" className="text-center relative group">
                <div className="relative mx-auto mb-6">
                  <div data-gsap="process-icon" className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center mx-auto shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 group-hover:-rotate-3">
                    <AsesorIcon className="w-12 h-12" />
                  </div>
                  <span data-gsap="process-badge" className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-background border-2 border-primary text-primary text-sm font-bold flex items-center justify-center shadow-sm">2</span>
                </div>
                <div data-gsap="process-text">
                  <h3 className="font-[family-name:var(--font-syne)] font-semibold mb-2 text-lg">Asignación de Asesor</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Se asigna un asesor según tu línea de investigación
                  </p>
                </div>
                <div data-gsap="process-peep"><PeepAsesor className="w-20 h-24 mx-auto opacity-70" /></div>
                <div data-gsap="process-connector" className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/40 to-primary/10" />
              </div>
              <div data-gsap="process-step" className="text-center relative group">
                <div className="relative mx-auto mb-6">
                  <div data-gsap="process-icon" className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center mx-auto shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 group-hover:rotate-3">
                    <DesarrolloIcon className="w-12 h-12" />
                  </div>
                  <span data-gsap="process-badge" className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-background border-2 border-primary text-primary text-sm font-bold flex items-center justify-center shadow-sm">3</span>
                </div>
                <div data-gsap="process-text">
                  <h3 className="font-[family-name:var(--font-syne)] font-semibold mb-2 text-lg">Desarrollo y Seguimiento</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Avanza en tu investigación con supervisión continua
                  </p>
                </div>
                <div data-gsap="process-peep"><PeepInvestigador className="w-20 h-24 mx-auto opacity-70" /></div>
                <div data-gsap="process-connector" className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/40 to-primary/10" />
              </div>
              <div data-gsap="process-step" className="text-center group">
                <div className="relative mx-auto mb-6">
                  <div data-gsap="process-icon" className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center mx-auto shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 group-hover:-rotate-3">
                    <SustentacionIcon className="w-12 h-12" />
                  </div>
                  <span data-gsap="process-badge" className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-background border-2 border-primary text-primary text-sm font-bold flex items-center justify-center shadow-sm">4</span>
                </div>
                <div data-gsap="process-text">
                  <h3 className="font-[family-name:var(--font-syne)] font-semibold mb-2 text-lg">Sustentación</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Programa y realiza la defensa de tu tesis
                  </p>
                </div>
                <div data-gsap="process-peep"><PeepGraduado className="w-20 h-24 mx-auto opacity-70" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonios" className="bg-muted/50 py-24 mt-24 relative">
          <div data-gsap="wave" className="absolute -top-24 left-0 w-full leading-[0]"><WaveDivider className="w-full h-24 block" /></div>
          <div className="container mx-auto px-4">
            <div data-gsap="section-header" className="text-center mb-16">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <Quote className="h-3 w-3" />
                Testimonios
              </Badge>
              <h2 className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl font-bold mb-3">Lo que dicen nuestros usuarios</h2>
              <SectionAccent className="w-28 h-2 mx-auto mb-4" />
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Experiencias de estudiantes y asesores que usan nuestra plataforma
              </p>
            </div>
            <InfiniteMovingCards speed="slow" pauseOnHover aria-label="Testimonios de usuarios" role="region">
              {/* Card 1 */}
              <Card className="relative hover:shadow-lg transition-shadow w-[min(350px,85vw)] shrink-0">
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                  <div className="flex gap-1 mb-4" role="img" aria-label="Calificación: 5 de 5 estrellas">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6">
                    &quot;La plataforma me ayudó a organizar todo el proceso de mi tesis.
                    El seguimiento con mi asesor fue mucho más fluido y pude graduarme a tiempo.&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/10 overflow-hidden shrink-0">
                      <PeepMaria className="w-full h-full" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">María Castillo</p>
                      <p className="text-xs text-muted-foreground">Ing. de Sistemas - 2024</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Card 2 */}
              <Card className="relative hover:shadow-lg transition-shadow w-[min(350px,85vw)] shrink-0">
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                  <div className="flex gap-1 mb-4" role="img" aria-label="Calificación: 5 de 5 estrellas">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6">
                    &quot;Como asesor, puedo dar seguimiento a múltiples tesistas de forma ordenada.
                    Las notificaciones y el calendario son muy útiles.&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/10 overflow-hidden shrink-0">
                      <PeepJuan className="w-full h-full" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Dr. Juan Ríos</p>
                      <p className="text-xs text-muted-foreground">Asesor - Fac. Ingeniería</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Card 3 */}
              <Card className="relative hover:shadow-lg transition-shadow w-[min(350px,85vw)] shrink-0">
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                  <div className="flex gap-1 mb-4" role="img" aria-label="Calificación: 5 de 5 estrellas">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6">
                    &quot;Excelente sistema para gestionar los documentos y ver el progreso.
                    Recomiendo a todos los estudiantes que inicien su tesis aquí.&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/5 border border-primary/10 overflow-hidden shrink-0">
                      <PeepLuis className="w-full h-full" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Luis Paredes</p>
                      <p className="text-xs text-muted-foreground">Administración - 2024</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </InfiniteMovingCards>
          </div>
          <div data-gsap="wave" className="absolute -bottom-24 left-0 w-full z-10 leading-[0]"><WaveDivider className="w-full h-24 block" flip /></div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 mt-24">
          <div className="container mx-auto px-4">
            <div data-gsap="section-header" className="text-center mb-16">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <BookOpen className="h-3 w-3" />
                FAQ
              </Badge>
              <h2 className="font-[family-name:var(--font-syne)] text-3xl md:text-4xl font-bold mb-3">Preguntas Frecuentes</h2>
              <SectionAccent className="w-28 h-2 mx-auto mb-4" />
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Respuestas a las dudas más comunes sobre nuestra plataforma
              </p>
            </div>
            <div data-gsap="faq-content" className="max-w-3xl mx-auto relative">
              {/* Peep character - thinking with coffee */}
              <PeepThinking className="hidden lg:block absolute -right-52 top-8 w-40 h-52 opacity-50" />
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem data-gsap="faq-item" value="item-1">
                  <AccordionTrigger className="text-left">
                    ¿Cómo me registro en la plataforma?
                  </AccordionTrigger>
                  <AccordionContent>
                    Para registrarte, haz clic en el botón "Registrarse" y completa el formulario con tus datos
                    institucionales. Necesitarás tu código de estudiante y correo institucional para verificar
                    tu identidad.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem data-gsap="faq-item" value="item-2">
                  <AccordionTrigger className="text-left">
                    ¿Puedo cambiar de asesor durante el proceso?
                  </AccordionTrigger>
                  <AccordionContent>
                    Sí, es posible solicitar un cambio de asesor. Deberás presentar una solicitud formal
                    a través de la plataforma, la cual será evaluada por la coordinación de tu facultad.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem data-gsap="faq-item" value="item-3">
                  <AccordionTrigger className="text-left">
                    ¿Qué formatos de archivo puedo subir?
                  </AccordionTrigger>
                  <AccordionContent>
                    Aceptamos documentos en formato PDF, DOC, DOCX para textos, y JPG, PNG para imágenes.
                    El tamaño máximo por archivo es de 25MB.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem data-gsap="faq-item" value="item-4">
                  <AccordionTrigger className="text-left">
                    ¿Cómo puedo ver el avance de mi tesis?
                  </AccordionTrigger>
                  <AccordionContent>
                    En tu panel de control encontrarás una barra de progreso y un timeline detallado
                    con todas las etapas de tu tesis. También recibirás notificaciones cuando tu asesor
                    revise tus avances.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem data-gsap="faq-item" value="item-5">
                  <AccordionTrigger className="text-left">
                    ¿La plataforma es gratuita?
                  </AccordionTrigger>
                  <AccordionContent>
                    Sí, la plataforma es completamente gratuita para todos los estudiantes y docentes
                    de la Universidad Nacional Amazónica de Madre de Dios.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-muted/50 py-24 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <Card data-gsap="cta-card" className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground overflow-hidden relative">
              <BackgroundBeams />
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-12 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="h-6 w-6" />
                    <span className="text-sm font-medium text-primary-foreground/80 uppercase tracking-wider">Empieza ahora</span>
                  </div>
                  <h2 className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold mb-3">
                    ¿Listo para comenzar tu tesis?
                  </h2>
                  <p className="text-primary-foreground/80 mb-6">
                    Regístrate y comienza a gestionar tu proyecto de investigación hoy mismo.
                  </p>
                  <Button asChild size="lg" variant="secondary" className="shrink-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 gap-2">
                    <Link href="/registrarse">
                      Crear Cuenta Gratis <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="hidden md:block shrink-0">
                  <LottieCta className="w-56 h-48" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div data-gsap="footer" className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/logo/logounamad.png"
                  alt="UNAMAD Logo"
                  width={32}
                  height={32}
                  className="rounded"
                />
                <span className="font-bold">Seguimiento de Tesis</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Plataforma integral para la gestión y seguimiento de tesis universitarias.
              </p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">v1.0</Badge>
                <Badge variant="outline" className="text-xs">UNAMAD</Badge>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Enlaces</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#top" className="hover:text-primary transition-colors">Inicio</Link></li>
                <li><Link href="#caracteristicas" className="hover:text-primary transition-colors">Características</Link></li>
                <li><Link href="#proceso" className="hover:text-primary transition-colors">Proceso</Link></li>
                <li><Link href="#testimonios" className="hover:text-primary transition-colors">Testimonios</Link></li>
                <li><Link href="#faq" className="hover:text-primary transition-colors">Preguntas Frecuentes</Link></li>
              </ul>
            </div>
            <div id="contacto">
              <h4 className="font-semibold mb-4">Contacto</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>Universidad Nacional Amazónica de Madre de Dios</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href="mailto:soporte@unamad.edu.pe" className="hover:text-primary transition-colors">soporte@unamad.edu.pe</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a href="tel:+5182571046" className="hover:text-primary transition-colors">(082) 571-046</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                  <span>Puerto Maldonado, Perú</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 Seguimiento de Tesis - UNAMAD. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      </SmoothScrollWrapper>
      {/* GSAP ScrollTrigger animations — zero-render layer */}
      <GsapLanding />
    </div>
  );
}
