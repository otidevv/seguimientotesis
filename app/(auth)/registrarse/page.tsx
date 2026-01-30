"use client";

import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Terms acceptance
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
      setError("Ingresa el número de documento");
      return;
    }

    if (tipoDocumento === "DNI" && numeroDocumento.length !== 8) {
      setError("El DNI debe tener 8 dígitos");
      return;
    }

    setError(null);
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
      setError(err instanceof Error ? err.message : "Error al validar");
      setIsValidated(false);
      setStatusMessage(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle step 1 validation
  const handleStep1Continue = () => {
    setError(null);

    if (!isValidated || !validatedData) {
      setError("Debes validar tu documento primero");
      return;
    }

    // Para externos, necesitan ingresar un correo
    if (validatedData.roleCode === "EXTERNO" && !emailCustom) {
      setError("Los usuarios externos deben ingresar un correo electrónico");
      return;
    }

    if (!password || password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
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
      setError("Debes aceptar los términos y condiciones");
      return;
    }

    if (!validatedData) {
      setError("Datos de validación no disponibles");
      return;
    }

    setError(null);
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

      setSuccess(result.message);

      setTimeout(() => {
        if (result.requiresVerification) {
          router.push("/verificar-email?email=" + encodeURIComponent(getEmailForRegistration()));
        } else {
          router.push("/login");
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
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
    <div className="min-h-screen bg-background bg-grid">
      <Header variant="auth" />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step > 1 ? <Check className="h-5 w-5" /> : "1"}
              </div>
              <span className={`text-sm hidden sm:inline ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Validar Identidad
              </span>
            </div>
            <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
              <span className={`text-sm hidden sm:inline ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Confirmación
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left side - Info */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Registro de Usuario</h2>
                    <p className="text-sm text-muted-foreground">UNAMAD - Sistema de Tesis</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <UserCheck className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Detección Automática</p>
                      <p className="text-xs text-muted-foreground">El sistema detecta si eres estudiante, docente o externo</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Datos Verificados</p>
                      <p className="text-xs text-muted-foreground">Tu información se valida con UNAMAD y RENIEC</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Acceso Inmediato</p>
                      <p className="text-xs text-muted-foreground">Una vez registrado, accede al sistema</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    ¿Ya tienes una cuenta?{" "}
                    <Link href="/login" className="text-primary font-medium hover:underline">
                      Iniciar Sesión
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg">
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
                  {/* Error/Success alerts */}
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert variant="success" className="mb-4">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  {/* Step 1: Validate Identity */}
                  {step === 1 && (
                    <div className="space-y-4">
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
                                    onChange={(e) => setEmailCustom(e.target.value)}
                                    className="pl-10"
                                    disabled={isLoading}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Ingresa un correo para recibir notificaciones
                                </p>
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
                                  onChange={(e) => setEmailPersonal(e.target.value)}
                                  className="pl-10"
                                  disabled={isLoading}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Un correo alternativo para recibir notificaciones
                              </p>
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
                    <div className="space-y-6">
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
                          <Link href="#" className="text-primary hover:underline">Términos y Condiciones</Link>
                          {" "}y la{" "}
                          <Link href="#" className="text-primary hover:underline">Política de Privacidad</Link>
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
    </div>
  );
}
