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
/* Peep characters: dynamic import — avoids bundling @opeepsfun/open-peeps (~100KB+) in initial load */
const HeroGraduados = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.HeroGraduados })));
const PeepMaria = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.PeepMaria })));
const PeepJuan = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.PeepJuan })));
const PeepLuis = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.PeepLuis })));
const PeepThinking = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.PeepThinking })));
const PeepRegistro = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.PeepRegistro })));
const PeepAsesor = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.PeepAsesor })));
const PeepInvestigador = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.PeepInvestigador })));
const PeepGraduado = dynamic(() => import("@/components/peep-characters").then(m => ({ default: m.PeepGraduado })));
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
  ExternalLink,
  Scale,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

const GsapLanding = dynamic(() => import("@/components/gsap-landing").then(m => ({ default: m.GsapLanding })));
const WhatsAppFloat = dynamic(() => import("@/components/whatsapp-float").then(m => ({ default: m.WhatsAppFloat })));
const ReglamentoFloat = dynamic(() => import("@/components/reglamento-float").then(m => ({ default: m.ReglamentoFloat })));
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
        <section data-gsap="hero" className="relative overflow-hidden min-h-[calc(100dvh-4rem)] flex flex-col noise-overlay">
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

          <div className="container mx-auto px-4 relative z-10 flex-1 flex items-start pt-8 sm:items-center sm:pt-0">
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
                <LottieBook className="w-[400px] h-[420px] drop-shadow-2xl" />
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
        {/* Wave top */}
        <div style={{ height: 150, overflow: 'hidden', marginBottom: -1 }}>
          <svg aria-hidden="true" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ height: '100%', width: '100%' }}>
            <path d="M-0.00,49.85 C150.00,149.60 349.20,-49.85 500.00,49.85 L507.56,166.82 L-8.23,167.80 Z" style={{ stroke: 'none', fill: '#db0455' }} />
          </svg>
        </div>

        <section data-gsap="stats" style={{ backgroundColor: '#db0455' }}>
          <div className="container mx-auto px-4 py-10 lg:py-16 relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[
                { icon: BookOpen, value: "500+", label: "Tesis Registradas" },
                { icon: Users, value: "150+", label: "Asesores Activos" },
                { icon: GraduationCap, value: "12", label: "Facultades" },
                { icon: Target, value: "95%", label: "Tasa de Éxito" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  data-gsap="stat-card"
                  className="text-center group"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-4 group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300">
                    <stat.icon className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <p data-gsap="stat-number" className="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-[family-name:var(--font-syne)] tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/70 mt-1.5 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Wave bottom */}
        <div className="bg-muted" style={{ height: 150, overflow: 'hidden', marginTop: -1 }}>
          <svg aria-hidden="true" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ height: '100%', width: '100%' }}>
            <path d="M-0.00,49.85 C150.00,149.60 271.37,-49.85 500.00,49.85 L500.00,0.00 L-0.00,0.00 Z" style={{ stroke: 'none', fill: '#db0455' }} />
          </svg>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* FEATURES — BENTO GRID                           */}
        {/* ═══════════════════════════════════════════════ */}
        <section id="caracteristicas" className="bg-muted py-24 relative overflow-hidden noise-overlay">
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
              {[
                { icon: FileText, title: 'Gestión de Documentos', desc: 'Sube, organiza y versiona todos los documentos relacionados con tu tesis en un solo lugar. Control de versiones automático y firma digital integrada.', featured: true },
                { icon: Users, title: 'Asignación de Asesores', desc: 'Conecta tesistas con asesores especializados según líneas de investigación.' },
                { icon: Calendar, title: 'Cronograma de Actividades', desc: 'Planifica y visualiza las etapas del desarrollo de la tesis con alertas automáticas.' },
                { icon: CheckCircle, title: 'Seguimiento de Avances', desc: 'Registra el progreso y recibe retroalimentación continua de tu asesor.' },
                { icon: ClipboardList, title: 'Evaluaciones y Revisiones', desc: 'Gestiona las observaciones y aprobaciones de los jurados con un flujo de trabajo estructurado. Historial completo de revisiones y notificaciones.', featured: true },
                { icon: BarChart3, title: 'Reportes y Estadísticas', desc: 'Visualiza métricas y genera reportes detallados del proceso académico.' },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  data-gsap="feature-card"
                  className={`group bg-background shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-500 relative overflow-hidden ${feature.featured ? 'lg:col-span-2' : ''}`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full group-hover:from-primary/10 transition-colors duration-300" />
                  <CardHeader className={`relative z-10 ${feature.featured ? 'flex flex-col md:flex-row md:items-center gap-4 md:gap-6' : ''}`}>
                    <div className={`${feature.featured ? 'w-16 h-16 rounded-2xl' : 'w-14 h-14 rounded-xl mb-4'} bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 shrink-0`}>
                      <feature.icon className={feature.featured ? 'h-8 w-8' : 'h-7 w-7'} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className={`font-[family-name:var(--font-syne)] ${feature.featured ? 'text-xl mb-2' : ''}`}>{feature.title}</CardTitle>
                      <CardDescription className={feature.featured ? 'text-base leading-relaxed' : ''}>
                        {feature.desc}
                      </CardDescription>
                    </div>
                    {feature.featured && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 hidden md:block" />
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
        {/* Wave bottom características — bg-muted color wave on white bg */}
        <div style={{ height: 150, overflow: 'hidden', marginTop: -1 }}>
          <svg aria-hidden="true" viewBox="0 0 500 150" preserveAspectRatio="none" style={{ height: '100%', width: '100%' }}>
            <path d="M-0.00,49.85 C150.00,149.60 271.37,-49.85 500.00,49.85 L500.00,0.00 L-0.00,0.00 Z" className="fill-muted" style={{ stroke: 'none' }} />
          </svg>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* PROCESS SECTION                                 */}
        {/* ═══════════════════════════════════════════════ */}
        <section id="proceso" className="py-24 relative overflow-hidden">
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
        {/* REGLAMENTO DE GRADOS Y TÍTULOS                  */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="py-16 bg-muted/40 border-y">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-background border-primary/15 shadow-lg overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-primary/60" />
                <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6 md:p-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 shrink-0">
                    <Scale className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs shrink-0">Normativa Vigente</Badge>
                    </div>
                    <h3 className="font-[family-name:var(--font-syne)] text-lg md:text-xl font-bold mb-2 tracking-tight">
                      Reglamento General de Grados y Títulos
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Consulta el reglamento oficial que regula los procedimientos para la obtención de grados académicos y títulos profesionales en la UNAMAD. Es importante que conozcas los requisitos y plazos establecidos antes de iniciar tu proceso de tesis.
                    </p>
                  </div>
                  <Button asChild className="shrink-0 gap-2 group shadow-md">
                    <a
                      href="https://www.gob.pe/institucion/unamad/informes-publicaciones/3962682-reglamento-general-de-grados-y-titulos-de-la-unamad"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver Reglamento
                      <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* FAQ SECTION                                     */}
        {/* ═══════════════════════════════════════════════ */}
        <section id="faq" className="py-24">
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
            <div data-gsap="faq-content" className="max-w-3xl mx-auto">
              <div className="rounded-2xl border bg-background p-1">
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
                    <AccordionItem key={faq.value} data-gsap="faq-item" value={faq.value} className="border-b-0 px-4">
                      <AccordionTrigger className="text-left hover:text-primary transition-colors text-[15px] py-5">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════ */}
        {/* CTA SECTION                                     */}
        {/* ═══════════════════════════════════════════════ */}
        <section className="bg-muted py-24 relative overflow-hidden">
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
      <footer className="border-t bg-muted/30 relative">
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
                  className="rounded-xl ring-1 ring-border"
                />
                <div>
                  <span className="font-[family-name:var(--font-syne)] font-bold text-sm block">Seguimiento de Tesis</span>
                  <span className="text-[10px] text-muted-foreground tracking-widest uppercase">UNAMAD</span>
                </div>
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
      <ReglamentoFloat />
      <WhatsAppFloat />
    </div>
  );
}
