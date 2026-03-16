"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { login, isLoading, isAuthenticated, isLoading: isCheckingAuth } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Verificar si viene de un redirect del middleware (sesión inválida ya determinada)
  const isFromRedirect = searchParams.has('redirect') || searchParams.has('expired');

  // Verificar si la sesión expiró
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
    }
  }, [searchParams]);

  // Redirigir al dashboard si ya está autenticado Y la verificación terminó
  // No redirigir si viene de un redirect del middleware (para evitar loops)
  useEffect(() => {
    if (isAuthenticated && !isCheckingAuth && !isFromRedirect) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.replace(redirect);
    }
  }, [isAuthenticated, isCheckingAuth, isFromRedirect, router, searchParams]);

  // Mostrar pantalla de carga SOLO si:
  // 1. Está verificando Y NO viene de un redirect del middleware
  // Si viene de redirect, el middleware ya determinó que no hay sesión válida
  // NUNCA mostrar loading si isFromRedirect es true
  if (isCheckingAuth && !isFromRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Por favor, completa todos los campos");
      return;
    }

    try {
      const redirectTo = searchParams.get('redirect') || undefined;
      await login({ email, password, rememberMe, redirectTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Header variant="auth" />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8 items-center">
            {/* Left side - Info */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Bienvenido de vuelta</h2>
                    <p className="text-sm text-muted-foreground">UNAMAD - Sistema de Tesis</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Acceso Rápido</p>
                      <p className="text-xs text-muted-foreground">Ingresa con tu correo institucional</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Panel Personalizado</p>
                      <p className="text-xs text-muted-foreground">Accede a tu dashboard según tu rol</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Sesión Segura</p>
                      <p className="text-xs text-muted-foreground">Tus datos están protegidos</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    ¿No tienes una cuenta?{" "}
                    <Link href="/registrarse" className="text-primary font-medium hover:underline">
                      Regístrate aquí
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <Image
                      src="/logo/logounamad.png"
                      alt="UNAMAD Logo"
                      width={64}
                      height={64}
                      className="rounded-xl"
                    />
                  </div>
                  <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
                  <CardDescription>
                    Ingresa tus credenciales para acceder al sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {sessionExpired && (
                      <Alert className="border-yellow-500/50 bg-yellow-500/10">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                          Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
                        </AlertDescription>
                      </Alert>
                    )}

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Institucional</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="usuario@unamad.edu.pe"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        <Link
                          href="/recuperar-password"
                          className="text-xs text-primary hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="remember"
                        className="accent-primary cursor-pointer"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isLoading}
                      />
                      <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                        Recordar mi sesión
                      </label>
                    </div>

                    <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Iniciando sesión...
                        </>
                      ) : (
                        <>
                          Iniciar Sesión <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <Separator className="my-6" />

                  <p className="text-center text-sm text-muted-foreground lg:hidden">
                    ¿No tienes una cuenta?{" "}
                    <Link href="/registrarse" className="text-primary font-medium hover:underline">
                      Regístrate aquí
                    </Link>
                  </p>

                  <div className="mt-4 p-4 rounded-lg bg-muted/50 text-center lg:hidden">
                    <p className="text-xs text-muted-foreground">
                      Al iniciar sesión, aceptas nuestros{" "}
                      <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline font-medium">Términos de Servicio</button>
                      {" "}y{" "}
                      <button type="button" onClick={() => setShowPrivacy(true)} className="text-primary hover:underline font-medium">Política de Privacidad</button>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Additional info for desktop */}
              <div className="hidden lg:block mt-6 p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">
                  Al iniciar sesión, aceptas nuestros{" "}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline font-medium">Términos de Servicio</button>
                  {" "}y{" "}
                  <button type="button" onClick={() => setShowPrivacy(true)} className="text-primary hover:underline font-medium">Política de Privacidad</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dialog: Términos y Condiciones */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Términos de Servicio</DialogTitle>
            <DialogDescription>
              Sistema de Seguimiento de Tesis - UNAMAD
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Última actualización: Marzo 2026</p>

              <h3 className="font-semibold text-foreground">1. Aceptación de los Términos</h3>
              <p>
                Al registrarse y utilizar el Sistema de Seguimiento de Tesis de la Universidad Nacional Amazónica de Madre de Dios (UNAMAD),
                usted acepta cumplir con estos Términos y Condiciones. Si no está de acuerdo, no debe utilizar el sistema.
              </p>

              <h3 className="font-semibold text-foreground">2. Descripción del Servicio</h3>
              <p>
                El sistema permite gestionar el proceso de tesis universitarias, incluyendo: registro y seguimiento de proyectos de tesis,
                asignación de asesores y jurados, gestión de trámites a través de mesa de partes, firma digital de documentos
                y generación de reportes académicos.
              </p>

              <h3 className="font-semibold text-foreground">3. Registro y Cuenta de Usuario</h3>
              <p>
                El usuario se compromete a proporcionar información veraz y actualizada durante el registro. La cuenta es personal
                e intransferible. El usuario es responsable de mantener la confidencialidad de su contraseña y de todas las actividades
                realizadas con su cuenta.
              </p>

              <h3 className="font-semibold text-foreground">4. Uso Adecuado del Sistema</h3>
              <p>El usuario se compromete a:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Utilizar el sistema únicamente para fines académicos relacionados con el proceso de tesis.</li>
                <li>No intentar acceder a información de otros usuarios sin autorización.</li>
                <li>No cargar contenido malicioso, ofensivo o que viole derechos de terceros.</li>
                <li>No realizar acciones que comprometan la seguridad o el rendimiento del sistema.</li>
                <li>Respetar los plazos y procedimientos establecidos por la universidad.</li>
              </ul>

              <h3 className="font-semibold text-foreground">5. Propiedad Intelectual</h3>
              <p>
                Los trabajos de tesis cargados en el sistema son propiedad intelectual de sus autores. La UNAMAD se reserva
                el derecho de uso académico conforme a su reglamento institucional. El sistema y su código fuente son propiedad
                de la UNAMAD.
              </p>

              <h3 className="font-semibold text-foreground">6. Firma Digital</h3>
              <p>
                Los documentos firmados digitalmente a través del sistema tienen validez legal conforme a la Ley de Firmas y
                Certificados Digitales del Perú (Ley N° 27269). El usuario es responsable del uso de su firma digital.
              </p>

              <h3 className="font-semibold text-foreground">7. Disponibilidad del Servicio</h3>
              <p>
                La UNAMAD se esfuerza por mantener el sistema disponible, pero no garantiza un funcionamiento ininterrumpido.
                Se podrán realizar mantenimientos programados con aviso previo.
              </p>

              <h3 className="font-semibold text-foreground">8. Limitación de Responsabilidad</h3>
              <p>
                La UNAMAD no será responsable por daños derivados del uso incorrecto del sistema, pérdida de datos por causas
                ajenas a la institución, o interrupciones del servicio por fuerza mayor.
              </p>

              <h3 className="font-semibold text-foreground">9. Modificaciones</h3>
              <p>
                La UNAMAD se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados
                a través del sistema y entrarán en vigencia desde su publicación.
              </p>

              <h3 className="font-semibold text-foreground">10. Contacto</h3>
              <p>
                Para consultas sobre estos términos, puede comunicarse con la Oficina de Tecnologías de la Información
                de la UNAMAD.
              </p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: Política de Privacidad */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Política de Privacidad</DialogTitle>
            <DialogDescription>
              Sistema de Seguimiento de Tesis - UNAMAD
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Última actualización: Marzo 2026</p>

              <h3 className="font-semibold text-foreground">1. Información que Recopilamos</h3>
              <p>El sistema recopila la siguiente información personal:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Datos de identidad:</strong> nombres, apellidos, número de documento de identidad (DNI, carnet de extranjería u otro).</li>
                <li><strong>Datos académicos:</strong> código de estudiante/docente, facultad, escuela profesional, créditos aprobados.</li>
                <li><strong>Datos de contacto:</strong> correo electrónico institucional y personal (opcional).</li>
                <li><strong>Datos de uso:</strong> registros de actividad dentro del sistema (auditoría).</li>
              </ul>

              <h3 className="font-semibold text-foreground">2. Cómo Obtenemos la Información</h3>
              <p>La información se obtiene de las siguientes fuentes:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Directamente del usuario al momento del registro.</li>
                <li>Del sistema académico de la UNAMAD (validación de estudiantes y docentes).</li>
                <li>De servicios externos de verificación de identidad (RENIEC) para usuarios externos.</li>
              </ul>

              <h3 className="font-semibold text-foreground">3. Uso de la Información</h3>
              <p>Utilizamos su información para:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Verificar su identidad y vinculación con la universidad.</li>
                <li>Gestionar el proceso de tesis (registro, seguimiento, evaluaciones).</li>
                <li>Enviar notificaciones relacionadas con el estado de su tesis y trámites.</li>
                <li>Generar reportes académicos y estadísticos.</li>
                <li>Garantizar la seguridad del sistema mediante registros de auditoría.</li>
              </ul>

              <h3 className="font-semibold text-foreground">4. Protección de Datos</h3>
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para proteger su información, incluyendo:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cifrado de contraseñas mediante algoritmos seguros (bcrypt).</li>
                <li>Autenticación mediante tokens JWT con expiración.</li>
                <li>Control de acceso basado en roles y permisos.</li>
                <li>Registro de auditoría de acciones sensibles.</li>
                <li>Comunicaciones cifradas (HTTPS).</li>
              </ul>

              <h3 className="font-semibold text-foreground">5. Compartición de Datos</h3>
              <p>
                Su información personal no será compartida con terceros, salvo en los siguientes casos:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cuando sea requerido por ley o autoridad competente.</li>
                <li>Para el proceso de firma digital a través de Firma Perú (PCM).</li>
                <li>Para fines académicos internos de la UNAMAD.</li>
              </ul>

              <h3 className="font-semibold text-foreground">6. Retención de Datos</h3>
              <p>
                Sus datos se conservarán mientras mantenga su cuenta activa y durante el tiempo necesario para cumplir
                con obligaciones legales y académicas de la universidad.
              </p>

              <h3 className="font-semibold text-foreground">7. Derechos del Usuario</h3>
              <p>Usted tiene derecho a:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Acceder a su información personal almacenada en el sistema.</li>
                <li>Solicitar la corrección de datos inexactos.</li>
                <li>Solicitar información sobre el uso de sus datos.</li>
              </ul>
              <p>
                Estos derechos se ejercen conforme a la Ley N° 29733 (Ley de Protección de Datos Personales del Perú).
              </p>

              <h3 className="font-semibold text-foreground">8. Cookies y Almacenamiento Local</h3>
              <p>
                El sistema utiliza almacenamiento local del navegador para mantener la sesión del usuario. No se
                utilizan cookies de terceros ni herramientas de rastreo.
              </p>

              <h3 className="font-semibold text-foreground">9. Cambios en la Política</h3>
              <p>
                Esta política puede ser actualizada periódicamente. Los cambios significativos serán notificados
                a través del sistema.
              </p>

              <h3 className="font-semibold text-foreground">10. Contacto</h3>
              <p>
                Para consultas sobre privacidad y protección de datos, puede comunicarse con la Oficina de
                Tecnologías de la Información de la UNAMAD.
              </p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
