import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ModeToggle } from "@/components/mode-toggle";
import { HeroIllustration, WaveDivider, BlobDecoration, GridPattern } from "@/components/decorative-svgs";
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
  Zap,
  HeartHandshake
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo/logounamad.png"
              alt="UNAMAD Logo"
              width={40}
              height={40}
              className="rounded"
            />
            <span className="text-xl font-bold hidden sm:inline">Seguimiento de Tesis</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#caracteristicas" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Características
            </Link>
            <Link href="#proceso" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Proceso
            </Link>
            <Link href="#testimonios" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Testimonios
            </Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              FAQ
            </Link>
            <Link href="#contacto" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Contacto
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Link href="/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/registrarse">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <BlobDecoration className="absolute -top-20 -right-20 w-[600px] h-[600px] opacity-60" />
        <BlobDecoration className="absolute -bottom-40 -left-40 w-[500px] h-[500px] opacity-40 rotate-180" />
        <GridPattern className="absolute inset-0 opacity-40" />

        <div className="container mx-auto px-4 py-24 md:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8">
              <Badge variant="secondary" className="w-fit px-4 py-1 animate-pulse">
                Plataforma de Gestión Académica
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Sistema de Seguimiento de{" "}
                <span className="text-primary">Tesis Universitarias</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl">
                Gestiona, supervisa y da seguimiento al progreso de tesis de pregrado y posgrado.
                Una plataforma integral para tesistas, asesores y revisores.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow w-full">
                    Iniciar Sesión <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/registrarse">
                  <Button size="lg" variant="outline" className="hover:bg-primary/5 w-full">
                    Registrarse
                  </Button>
                </Link>
              </div>
              {/* Trust indicators */}
              <div className="flex items-center gap-6 pt-4">
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
            <div className="hidden lg:block">
              <HeroIllustration className="w-full h-auto max-w-md mx-auto drop-shadow-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <WaveDivider className="w-full h-24 -mt-1" />

      {/* Stats Section */}
      <section className="bg-muted/50">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-primary">500+</p>
              <p className="text-sm text-muted-foreground mt-1">Tesis Registradas</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-primary">150+</p>
              <p className="text-sm text-muted-foreground mt-1">Asesores Activos</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-primary">12</p>
              <p className="text-sm text-muted-foreground mt-1">Facultades</p>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-primary">95%</p>
              <p className="text-sm text-muted-foreground mt-1">Tasa de Éxito</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider flipped */}
      <WaveDivider className="w-full h-24 -mb-1" flip />

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Beneficios</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Por qué elegirnos?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Nuestra plataforma está diseñada para simplificar tu proceso de tesis
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Rápido y Eficiente</h3>
            <p className="text-muted-foreground">
              Reduce el tiempo de gestión administrativa en un 70% con nuestra plataforma automatizada.
            </p>
          </div>
          <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Seguro y Confiable</h3>
            <p className="text-muted-foreground">
              Tus documentos y datos están protegidos con encriptación de nivel empresarial.
            </p>
          </div>
          <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <HeartHandshake className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Soporte Dedicado</h3>
            <p className="text-muted-foreground">
              Equipo de soporte disponible para ayudarte en cada paso de tu investigación.
            </p>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <WaveDivider className="w-full h-24 -mt-1" />

      {/* Features Section */}
      <section id="caracteristicas" className="bg-muted/50 py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Características</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Herramientas diseñadas para gestionar el proceso de tesis de forma eficiente
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle>Gestión de Documentos</CardTitle>
                <CardDescription>
                  Sube y organiza todos los documentos relacionados con tu tesis en un solo lugar
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>Asignación de Asesores</CardTitle>
                <CardDescription>
                  Conecta tesistas con asesores especializados según líneas de investigación
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Calendar className="h-6 w-6" />
                </div>
                <CardTitle>Cronograma de Actividades</CardTitle>
                <CardDescription>
                  Planifica y visualiza las etapas del desarrollo de la tesis
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <CardTitle>Seguimiento de Avances</CardTitle>
                <CardDescription>
                  Registra el progreso y recibe retroalimentación de tu asesor
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <CardTitle>Evaluaciones y Revisiones</CardTitle>
                <CardDescription>
                  Gestiona las observaciones y aprobaciones de los jurados
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <CardTitle>Reportes y Estadísticas</CardTitle>
                <CardDescription>
                  Visualiza métricas y genera reportes del proceso académico
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Wave divider flipped */}
      <WaveDivider className="w-full h-24 -mb-1" flip />

      {/* Process Section */}
      <section id="proceso" className="py-24 relative overflow-hidden">
        <GridPattern className="absolute inset-0 opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Proceso</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Proceso de Tesis</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Acompañamos cada etapa del desarrollo de tu investigación
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center relative group">
              <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="font-semibold mb-2">Registro del Proyecto</h3>
              <p className="text-sm text-muted-foreground">
                Inscribe tu tema de tesis y datos del proyecto
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/40 to-primary/10" />
            </div>
            <div className="text-center relative group">
              <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="font-semibold mb-2">Asignación de Asesor</h3>
              <p className="text-sm text-muted-foreground">
                Se asigna un asesor según tu línea de investigación
              </p>
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/40 to-primary/10" />
            </div>
            <div className="text-center relative group">
              <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="font-semibold mb-2">Desarrollo y Seguimiento</h3>
              <p className="text-sm text-muted-foreground">
                Avanza en tu investigación con supervisión continua
              </p>
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/40 to-primary/10" />
            </div>
            <div className="text-center group">
              <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                4
              </div>
              <h3 className="font-semibold mb-2">Sustentación</h3>
              <p className="text-sm text-muted-foreground">
                Programa y realiza la defensa de tu tesis
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <WaveDivider className="w-full h-24 -mt-1" />

      {/* Testimonials Section */}
      <section id="testimonios" className="bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonios</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que dicen nuestros usuarios</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experiencias de estudiantes y asesores que usan nuestra plataforma
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="relative hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                <p className="text-muted-foreground mb-6">
                  "La plataforma me ayudó a organizar todo el proceso de mi tesis.
                  El seguimiento con mi asesor fue mucho más fluido y pude graduarme a tiempo."
                </p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">MC</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">María Castillo</p>
                    <p className="text-xs text-muted-foreground">Ing. de Sistemas - 2024</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="relative hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                <p className="text-muted-foreground mb-6">
                  "Como asesor, puedo dar seguimiento a múltiples tesistas de forma ordenada.
                  Las notificaciones y el calendario son muy útiles."
                </p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">JR</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">Dr. Juan Ríos</p>
                    <p className="text-xs text-muted-foreground">Asesor - Fac. Ingeniería</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="relative hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                <p className="text-muted-foreground mb-6">
                  "Excelente sistema para gestionar los documentos y ver el progreso.
                  Recomiendo a todos los estudiantes que inicien su tesis aquí."
                </p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">LP</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">Luis Paredes</p>
                    <p className="text-xs text-muted-foreground">Administración - 2024</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Wave divider flipped */}
      <WaveDivider className="w-full h-24 -mb-1" flip />

      {/* FAQ Section */}
      <section id="faq" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Preguntas Frecuentes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Respuestas a las dudas más comunes sobre nuestra plataforma
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  ¿Cómo me registro en la plataforma?
                </AccordionTrigger>
                <AccordionContent>
                  Para registrarte, haz clic en el botón "Registrarse" y completa el formulario con tus datos
                  institucionales. Necesitarás tu código de estudiante y correo institucional para verificar
                  tu identidad.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  ¿Puedo cambiar de asesor durante el proceso?
                </AccordionTrigger>
                <AccordionContent>
                  Sí, es posible solicitar un cambio de asesor. Deberás presentar una solicitud formal
                  a través de la plataforma, la cual será evaluada por la coordinación de tu facultad.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  ¿Qué formatos de archivo puedo subir?
                </AccordionTrigger>
                <AccordionContent>
                  Aceptamos documentos en formato PDF, DOC, DOCX para textos, y JPG, PNG para imágenes.
                  El tamaño máximo por archivo es de 25MB.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  ¿Cómo puedo ver el avance de mi tesis?
                </AccordionTrigger>
                <AccordionContent>
                  En tu panel de control encontrarás una barra de progreso y un timeline detallado
                  con todas las etapas de tu tesis. También recibirás notificaciones cuando tu asesor
                  revise tus avances.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
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

      {/* Wave divider */}
      <WaveDivider className="w-full h-24 -mt-1" />

      {/* CTA Section */}
      <section className="bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground overflow-hidden relative">
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <circle cx="0" cy="0" r="40" fill="white" />
                <circle cx="100" cy="100" r="50" fill="white" />
                <circle cx="80" cy="20" r="30" fill="white" />
              </svg>
            </div>
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-12 relative z-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  ¿Listo para comenzar tu tesis?
                </h2>
                <p className="text-primary-foreground/80">
                  Regístrate y comienza a gestionar tu proyecto de investigación hoy mismo.
                </p>
              </div>
              <Link href="/registrarse">
                <Button size="lg" variant="secondary" className="shrink-0 shadow-lg hover:shadow-xl transition-shadow">
                  Crear Cuenta Gratis
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
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
                <li><Link href="#" className="hover:text-primary transition-colors">Inicio</Link></li>
                <li><Link href="#caracteristicas" className="hover:text-primary transition-colors">Características</Link></li>
                <li><Link href="#proceso" className="hover:text-primary transition-colors">Proceso</Link></li>
                <li><Link href="#testimonios" className="hover:text-primary transition-colors">Testimonios</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Guía de Usuario</Link></li>
                <li><Link href="#faq" className="hover:text-primary transition-colors">Preguntas Frecuentes</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Soporte Técnico</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Tutoriales</Link></li>
              </ul>
            </div>
            <div id="contacto">
              <h4 className="font-semibold mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Universidad Nacional Amazónica de Madre de Dios</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>soporte@unamad.edu.pe</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2025 Seguimiento de Tesis - UNAMAD. Todos los derechos reservados.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-primary transition-colors">Términos</Link>
              <Link href="#" className="hover:text-primary transition-colors">Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
