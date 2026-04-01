"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/layout";
import { useAuth } from "@/contexts/auth-context";
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  IdCard,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Search,
  Check,
  UserCheck,
  BookOpen
} from "lucide-react";
import Link from "next/link";

type RoleCode = "ESTUDIANTE" | "DOCENTE" | "EXTERNO";
type TipoDocumento = "DNI" | "CARNET_EXTRANJERIA" | "PASAPORTE" | "OTRO";

interface Carrera {
  codigoEstudiante: string;
  carreraNombre: string;
  facultadNombre: string;
  creditosAprobados: number;
}

interface ValidatedData {
  roleCode: RoleCode;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string | null;
  emailPersonal: string | null;
  facultad: string | null;
  escuela: string | null;
  codigoEstudiante: string | null;
  codigoDocente: string | null;
  carreras?: Carrera[];
}

export default function RegistrarsePage() {
  const router = useRouter();
  const { register, isLoading: authLoading, isAuthenticated } = useAuth();

  // Form state
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Removed inline error/success state — using sonner toast instead
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Document data
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState("");

  // Validated data from API (read-only)
  const [validatedData, setValidatedData] = useState<ValidatedData | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  // User can edit email for externos or add personal email
  const [emailPersonal, setEmailPersonal] = useState("");
  const [emailCustom, setEmailCustom] = useState(""); // Solo para externos

  // Email validation
  const isValidEmail = (email: string) => {
    if (!email) return null;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  };

  // Check if email already exists (debounced)
  const [emailExists, setEmailExists] = useState<Record<string, boolean>>({});
  const [checkingEmail, setCheckingEmail] = useState<Record<string, boolean>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const checkEmailExists = useCallback((email: string, field: string) => {
    if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);
    if (!email || !isValidEmail(email)) {
      setEmailExists(prev => ({ ...prev, [field]: false }));
      setCheckingEmail(prev => ({ ...prev, [field]: false }));
      return;
    }
    setCheckingEmail(prev => ({ ...prev, [field]: true }));
    debounceTimers.current[field] = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setEmailExists(prev => ({ ...prev, [field]: data.exists }));
      } catch {
        setEmailExists(prev => ({ ...prev, [field]: false }));
      } finally {
        setCheckingEmail(prev => ({ ...prev, [field]: false }));
      }
    }, 500);
  }, []);

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Terms acceptance
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Redirigir al dashboard si ya está autenticado Y la verificación terminó
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // Reset validation when document changes
  useEffect(() => {
    if (isValidated) {
      setIsValidated(false);
      setValidatedData(null);
      setStatusMessage(null);
    }
  }, [numeroDocumento, tipoDocumento]);

  // Mostrar pantalla de carga solo mientras verifica
  // No incluir isAuthenticated en la condición para evitar loops
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Validate user - Auto-detects type
  const handleValidateUser = async () => {
    if (!numeroDocumento) {
      toast.error("Ingresa el número de documento");
      return;
    }

    if (tipoDocumento === "DNI" && numeroDocumento.length !== 8) {
      toast.error("El DNI debe tener 8 dígitos");
      return;
    }

    setIsValidating(true);
    setStatusMessage("Buscando en el sistema...");

    try {
      const response = await fetch("/api/auth/validate-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroDocumento }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se encontró información");
      }

      if (data.success && data.data) {
        setValidatedData(data.data);
        setStatusMessage(data.message);
        setIsValidated(true);

        // Pre-fill email personal if exists
        if (data.data.emailPersonal) {
          setEmailPersonal(data.data.emailPersonal);
        }
      } else {
        throw new Error(data.message || "No se encontraron datos");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al validar");
      setIsValidated(false);
      setStatusMessage(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle step 1 validation
  const handleStep1Continue = () => {
    if (!isValidated || !validatedData) {
      toast.error("Debes validar tu documento primero");
      return;
    }

    // Para externos, necesitan ingresar un correo válido
    if (validatedData.roleCode === "EXTERNO") {
      if (!emailCustom) {
        toast.error("Los usuarios externos deben ingresar un correo electrónico");
        return;
      }
      if (!isValidEmail(emailCustom)) {
        toast.error("Ingresa un correo electrónico válido");
        return;
      }
    }

    // Validar email personal si fue ingresado
    if (emailPersonal && !isValidEmail(emailPersonal)) {
      toast.error("El correo personal ingresado no es válido");
      return;
    }

    // Verificar que no existan emails duplicados
    if (emailExists.custom || emailExists.personal) {
      toast.error("El correo ingresado ya está registrado en el sistema");
      return;
    }

    if (!password || password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setStep(2);
  };

  // Get the email to use for registration
  const getEmailForRegistration = (): string => {
    if (validatedData?.roleCode === "EXTERNO") {
      return emailCustom;
    }
    return validatedData?.email || emailCustom;
  };

  // Check if student has multiple careers
  const hasMultipleCareers = validatedData?.carreras && validatedData.carreras.length > 1;

  // Handle form submission
  const handleSubmit = async () => {
    if (!acceptedTerms) {
      toast.error("Debes aceptar los términos y condiciones");
      return;
    }

    if (!validatedData) {
      toast.error("Datos de validación no disponibles");
      return;
    }

    setIsSubmitting(true);

    try {
      const registerData = {
        tipoDocumento,
        numeroDocumento,
        email: getEmailForRegistration(),
        password,
        confirmPassword,
        nombres: validatedData.nombres,
        apellidoPaterno: validatedData.apellidoPaterno,
        apellidoMaterno: validatedData.apellidoMaterno,
        roleCode: validatedData.roleCode,
        emailPersonal: emailPersonal || undefined,
      };

      console.log('[Register] Sending data:', registerData);

      const result = await register(registerData);

      toast.success(result.message);

      setTimeout(() => {
        if (result.requiresVerification) {
          router.push("/verificar-email?email=" + encodeURIComponent(getEmailForRegistration()));
        } else {
          router.push("/login");
        }
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isValidating;

  // Get badge color based on role code
  const getRoleBadge = (roleCode: RoleCode) => {
    switch (roleCode) {
      case "ESTUDIANTE":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Estudiante</Badge>;
      case "DOCENTE":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Docente</Badge>;
      case "EXTERNO":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Externo</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header variant="auth" />

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= 1 ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' : 'bg-muted text-muted-foreground'}`}>
                {step > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span className={`text-sm hidden sm:inline font-medium transition-colors duration-300 ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Validar Identidad
              </span>
            </div>
            <div className={`h-0.5 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-primary w-12' : 'bg-border w-12'}`} />
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= 2 ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' : 'bg-muted text-muted-foreground'}`}>
                {step > 2 ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <span className={`text-sm hidden sm:inline font-medium transition-colors duration-300 ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Confirmación
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left side - Info */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg tracking-tight">Registro de Usuario</h2>
                    <p className="text-xs text-muted-foreground">UNAMAD - Sistema de Tesis</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { icon: UserCheck, title: 'Detección Automática', desc: 'El sistema detecta si eres estudiante, docente o externo' },
                    { icon: CheckCircle2, title: 'Datos Verificados', desc: 'Tu información se valida con UNAMAD y RENIEC' },
                    { icon: CheckCircle2, title: 'Acceso Inmediato', desc: 'Una vez registrado, accede al sistema' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    ¿Ya tienes una cuenta?{" "}
                    <Link href="/login" className="text-primary font-semibold hover:underline">
                      Iniciar Sesión
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg border-border/60">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {step === 1 && "Validar Identidad"}
                    {step === 2 && "Confirmar Registro"}
                  </CardTitle>
                  <CardDescription>
                    {step === 1 && "Ingresa tu número de documento para validar tu identidad"}
                    {step === 2 && "Revisa tus datos antes de completar el registro"}
                  </CardDescription>
                </CardHeader>
                <CardContent>

                  {/* Step 1: Validate Identity */}
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 animation-duration-300">
                      {/* Documento de identidad */}
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipoDocumento">Tipo Documento</Label>
                          <Select
                            value={tipoDocumento}
                            onValueChange={(value) => setTipoDocumento(value as TipoDocumento)}
                            disabled={isLoading || isValidated}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DNI">DNI</SelectItem>
                              <SelectItem value="CARNET_EXTRANJERIA">Carnet Extranjería</SelectItem>
                              <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                              <SelectItem value="OTRO">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="numeroDocumento">Número de Documento</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="numeroDocumento"
                                placeholder={tipoDocumento === "DNI" ? "12345678" : "Número de documento"}
                                value={numeroDocumento}
                                onChange={(e) => setNumeroDocumento(e.target.value)}
                                maxLength={tipoDocumento === "DNI" ? 8 : 20}
                                className="pl-10"
                                disabled={isLoading || isValidated}
                              />
                            </div>
                            <Button
                              type="button"
                              variant={isValidated ? "outline" : "default"}
                              onClick={handleValidateUser}
                              disabled={isLoading || isValidated}
                            >
                              {isValidating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isValidated ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {statusMessage && (
                            <p className={`text-xs flex items-center gap-1 ${isValidated ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {isValidated && <Check className="h-3 w-3" />}
                              {statusMessage}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Datos validados (solo lectura) */}
                      {isValidated && validatedData && (
                        <>
                          <Separator />

                          {/* Tipo de usuario detectado */}
                          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Tipo de Usuario Detectado</span>
                              {getRoleBadge(validatedData.roleCode)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {validatedData.roleCode === "ESTUDIANTE" && "Registrado como estudiante de UNAMAD"}
                              {validatedData.roleCode === "DOCENTE" && "Registrado como docente de UNAMAD"}
                              {validatedData.roleCode === "EXTERNO" && "Registrado como persona externa (validado por RENIEC)"}
                            </p>
                          </div>

                          {/* Nombres (solo lectura) */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nombres</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  value={validatedData.nombres}
                                  className="pl-10 bg-muted"
                                  readOnly
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Apellido Paterno</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  value={validatedData.apellidoPaterno}
                                  className="pl-10 bg-muted"
                                  readOnly
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Apellido Materno</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  value={validatedData.apellidoMaterno}
                                  className="pl-10 bg-muted"
                                  readOnly
                                />
                              </div>
                            </div>

                            {/* Correo - depende del tipo */}
                            {validatedData.roleCode !== "EXTERNO" ? (
                              <div className="space-y-2">
                                <Label>Correo Institucional</Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    value={validatedData.email || ""}
                                    className="pl-10 bg-muted"
                                    readOnly
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label htmlFor="emailCustom">Correo Electrónico *</Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="emailCustom"
                                    type="email"
                                    placeholder="tucorreo@ejemplo.com"
                                    value={emailCustom}
                                    onChange={(e) => { setEmailCustom(e.target.value); checkEmailExists(e.target.value, 'custom'); }}
                                    className={`pl-10 pr-10 ${emailCustom && (emailExists.custom ? 'border-destructive focus-visible:ring-destructive/30' : isValidEmail(emailCustom) ? 'border-green-500 focus-visible:ring-green-500/30' : 'border-destructive focus-visible:ring-destructive/30')}`}
                                    aria-invalid={emailCustom ? (!isValidEmail(emailCustom) || emailExists.custom) : undefined}
                                    disabled={isLoading}
                                  />
                                  {emailCustom && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                      {checkingEmail.custom
                                        ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                                        : emailExists.custom
                                          ? <AlertCircle className="h-4 w-4 text-destructive" />
                                          : isValidEmail(emailCustom)
                                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            : <AlertCircle className="h-4 w-4 text-destructive" />}
                                    </span>
                                  )}
                                </div>
                                {emailCustom && emailExists.custom ? (
                                  <p className="text-xs text-destructive" role="alert">
                                    Ya existe un usuario con este correo electrónico
                                  </p>
                                ) : emailCustom && !isValidEmail(emailCustom) ? (
                                  <p className="text-xs text-destructive" role="alert">
                                    Ingresa un correo válido (ejemplo: usuario@dominio.com)
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Ingresa un correo para recibir notificaciones
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Información académica - Carreras para estudiantes */}
                          {validatedData.roleCode === "ESTUDIANTE" && validatedData.carreras && validatedData.carreras.length > 0 && (
                            <div className="space-y-4">
                              {/* Aviso si tiene múltiples carreras */}
                              {hasMultipleCareers && (
                                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                  <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Tienes {validatedData.carreras.length} carreras registradas. Todas serán vinculadas a tu cuenta.
                                  </p>
                                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1 ml-6">
                                    Podrás seleccionar la carrera específica al momento de crear tu tesis.
                                  </p>
                                </div>
                              )}

                              {/* Mostrar todas las carreras */}
                              <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  {hasMultipleCareers ? "Carreras Registradas" : "Carrera"}
                                </Label>

                                {validatedData.carreras.map((carrera, index) => (
                                  <div
                                    key={index}
                                    className="p-4 rounded-lg bg-muted/50 border space-y-3"
                                  >
                                    {hasMultipleCareers && (
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          Carrera {index + 1}
                                        </Badge>
                                      </div>
                                    )}
                                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <p className="text-muted-foreground text-xs">Facultad</p>
                                        <p className="font-medium">{carrera.facultadNombre}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground text-xs">Escuela Profesional</p>
                                        <p className="font-medium">{carrera.carreraNombre}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground text-xs">Código de Estudiante</p>
                                        <p className="font-medium">{carrera.codigoEstudiante}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground text-xs">Créditos Aprobados</p>
                                        <p className="font-medium">{carrera.creditosAprobados}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Información académica para docentes */}
                          {validatedData.roleCode === "DOCENTE" && (validatedData.facultad || validatedData.escuela) && (
                            <div className="grid sm:grid-cols-2 gap-4">
                              {validatedData.facultad && (
                                <div className="space-y-2">
                                  <Label>Facultad</Label>
                                  <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      value={validatedData.facultad}
                                      className="pl-10 bg-muted"
                                      readOnly
                                    />
                                  </div>
                                </div>
                              )}
                              {validatedData.escuela && (
                                <div className="space-y-2">
                                  <Label>Departamento Académico</Label>
                                  <div className="relative">
                                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      value={validatedData.escuela}
                                      className="pl-10 bg-muted"
                                      readOnly
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Email personal (opcional para todos) */}
                          {validatedData.roleCode !== "EXTERNO" && (
                            <div className="space-y-2">
                              <Label htmlFor="emailPersonal">Correo Personal (opcional)</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="emailPersonal"
                                  type="email"
                                  placeholder="correo@personal.com"
                                  value={emailPersonal}
                                  onChange={(e) => { setEmailPersonal(e.target.value); checkEmailExists(e.target.value, 'personal'); }}
                                  className={`pl-10 pr-10 ${emailPersonal && (emailExists.personal ? 'border-destructive focus-visible:ring-destructive/30' : isValidEmail(emailPersonal) ? 'border-green-500 focus-visible:ring-green-500/30' : 'border-destructive focus-visible:ring-destructive/30')}`}
                                  aria-invalid={emailPersonal ? (!isValidEmail(emailPersonal) || emailExists.personal) : undefined}
                                  disabled={isLoading}
                                />
                                {emailPersonal && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {checkingEmail.personal
                                      ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                                      : emailExists.personal
                                        ? <AlertCircle className="h-4 w-4 text-destructive" />
                                        : isValidEmail(emailPersonal)
                                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                          : <AlertCircle className="h-4 w-4 text-destructive" />}
                                  </span>
                                )}
                              </div>
                              {emailPersonal && emailExists.personal ? (
                                <p className="text-xs text-destructive" role="alert">
                                  Ya existe un usuario con este correo electrónico
                                </p>
                              ) : emailPersonal && !isValidEmail(emailPersonal) ? (
                                <p className="text-xs text-destructive" role="alert">
                                  Ingresa un correo válido (ejemplo: usuario@dominio.com)
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Un correo alternativo para recibir notificaciones
                                </p>
                              )}
                            </div>
                          )}

                          <Separator />

                          {/* Contraseñas */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="password">Contraseña</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="password"
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Mínimo 8 caracteres"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="pl-10 pr-10"
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
                            <div className="space-y-2">
                              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="confirmPassword"
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Repite tu contraseña"
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  className="pl-10 pr-10"
                                  disabled={isLoading}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                  disabled={isLoading}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="pt-4">
                        <Button
                          type="button"
                          className="w-full"
                          onClick={handleStep1Continue}
                          disabled={isLoading || !isValidated}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            "Continuar"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Confirmation */}
                  {step === 2 && validatedData && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 animation-duration-300">
                      <div className="rounded-lg bg-muted/50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            Datos Personales
                          </h4>
                          {getRoleBadge(validatedData.roleCode)}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Nombre completo</p>
                            <p className="font-medium">{`${validatedData.nombres} ${validatedData.apellidoPaterno} ${validatedData.apellidoMaterno}`}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Documento</p>
                            <p className="font-medium">{tipoDocumento}: {numeroDocumento}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Correo</p>
                            <p className="font-medium">{getEmailForRegistration()}</p>
                          </div>
                          {emailPersonal && validatedData.roleCode !== "EXTERNO" && (
                            <div>
                              <p className="text-muted-foreground">Correo personal</p>
                              <p className="font-medium">{emailPersonal}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Información académica para estudiantes */}
                      {validatedData.roleCode === "ESTUDIANTE" && validatedData.carreras && validatedData.carreras.length > 0 && (
                        <div className="rounded-lg bg-muted/50 p-4 space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            {hasMultipleCareers ? `Carreras a Registrar (${validatedData.carreras.length})` : "Información Académica"}
                          </h4>

                          {validatedData.carreras.map((carrera, index) => (
                            <div key={index} className={hasMultipleCareers ? "p-3 rounded border bg-background" : ""}>
                              {hasMultipleCareers && (
                                <p className="text-xs text-muted-foreground mb-2">Carrera {index + 1}</p>
                              )}
                              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Facultad</p>
                                  <p className="font-medium">{carrera.facultadNombre}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Escuela Profesional</p>
                                  <p className="font-medium">{carrera.carreraNombre}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Código</p>
                                  <p className="font-medium">{carrera.codigoEstudiante}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Créditos</p>
                                  <p className="font-medium">{carrera.creditosAprobados}</p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {hasMultipleCareers && (
                            <p className="text-xs text-muted-foreground pt-2 border-t">
                              Todas las carreras serán vinculadas. Seleccionarás la carrera al crear tu tesis.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Información académica para docentes */}
                      {validatedData.roleCode === "DOCENTE" && (validatedData.facultad || validatedData.escuela) && (
                        <div className="rounded-lg bg-muted/50 p-4 space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            Información Académica
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-3 text-sm">
                            {validatedData.facultad && (
                              <div>
                                <p className="text-muted-foreground">Facultad</p>
                                <p className="font-medium">{validatedData.facultad}</p>
                              </div>
                            )}
                            {validatedData.escuela && (
                              <div>
                                <p className="text-muted-foreground">Departamento Académico</p>
                                <p className="font-medium">{validatedData.escuela}</p>
                              </div>
                            )}
                            {validatedData.codigoDocente && (
                              <div>
                                <p className="text-muted-foreground">Código de Docente</p>
                                <p className="font-medium">{validatedData.codigoDocente}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2 p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <input
                          type="checkbox"
                          id="terms"
                          className="mt-1 accent-primary cursor-pointer"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          disabled={isLoading}
                        />
                        <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                          Acepto los{" "}
                          <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline font-medium">Términos y Condiciones</button>
                          {" "}y la{" "}
                          <button type="button" onClick={() => setShowPrivacy(true)} className="text-primary hover:underline font-medium">Política de Privacidad</button>
                          {" "}del Sistema de Seguimiento de Tesis.
                        </label>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setStep(1)}
                          disabled={isLoading}
                        >
                          Atrás
                        </Button>
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={handleSubmit}
                          disabled={isLoading || !acceptedTerms}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Registrando...
                            </>
                          ) : (
                            "Crear Cuenta"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  <Separator className="my-6" />

                  <p className="text-center text-sm text-muted-foreground lg:hidden">
                    ¿Ya tienes una cuenta?{" "}
                    <Link href="/login" className="text-primary font-medium hover:underline">
                      Iniciar Sesión
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Dialog: Términos y Condiciones */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Términos y Condiciones</DialogTitle>
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
