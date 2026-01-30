"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
      await login({ email, password, rememberMe });
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
                      <Link href="#" className="text-primary hover:underline">Términos</Link>
                      {" "}y{" "}
                      <Link href="#" className="text-primary hover:underline">Política de Privacidad</Link>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Additional info for desktop */}
              <div className="hidden lg:block mt-6 p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">
                  Al iniciar sesión, aceptas nuestros{" "}
                  <Link href="#" className="text-primary hover:underline">Términos de Servicio</Link>
                  {" "}y{" "}
                  <Link href="#" className="text-primary hover:underline">Política de Privacidad</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
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
