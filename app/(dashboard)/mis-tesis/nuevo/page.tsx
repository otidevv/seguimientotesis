'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { FullscreenLoader } from '@/components/ui/fullscreen-loader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Info,
  Loader2,
  Plus,
  Search,
  Sparkles,
  User,
  UserPlus,
  Users,
  X,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

interface Carrera {
  id: string
  codigoEstudiante: string
  carreraNombre: string
  facultadId: string
  facultad: {
    id: string
    nombre: string
  }
  tesisActiva?: {
    id: string
    titulo: string
    estado: string
  } | null
}

interface Persona {
  id: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
  email: string
  codigoEstudiante?: string
  codigoDocente?: string
  carrera?: string
  departamento?: string
  facultad?: string
}

// Configuración de pasos
const STEPS = [
  { id: 1, title: 'Carrera', icon: GraduationCap, description: 'Selecciona tu programa' },
  { id: 2, title: 'Proyecto', icon: FileText, description: 'Información básica' },
  { id: 3, title: 'Equipo', icon: Users, description: 'Autores y asesores' },
  { id: 4, title: 'Confirmar', icon: CheckCircle2, description: 'Revisa y envía' },
]

const STEP_TIPS: Record<number, { titulo: string; descripcion: string }> = {
  1: {
    titulo: 'Selección de carrera',
    descripcion: 'Solo puedes tener un proyecto activo por carrera. Si ya tienes uno, deberás finalizarlo o archivarlo antes de crear otro.',
  },
  2: {
    titulo: 'Redacción del título',
    descripcion: 'Redacta un título claro y específico que refleje el alcance de tu investigación. Podrás modificarlo más adelante si es necesario.',
  },
  3: {
    titulo: 'Conformación del equipo',
    descripcion: 'El asesor es obligatorio y será notificado por correo. El coasesor y tesista 2 son opcionales.',
  },
  4: {
    titulo: 'Revisión final',
    descripcion: 'Asegúrate de tener listo tu proyecto de tesis en PDF y la carta de aceptación del asesor para completar el registro.',
  },
}

export default function NuevoProyectoPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole } = useAuth()

  // Estado del wizard
  const [currentStep, setCurrentStep] = useState(1)
  const [maxStepReached, setMaxStepReached] = useState(1)
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right')

  // Estados del formulario
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('')
  const [titulo, setTitulo] = useState('')
  const [resumen, setResumen] = useState('')
  const [palabrasClave, setPalabrasClave] = useState<string[]>([])
  const [nuevaPalabra, setNuevaPalabra] = useState('')
  const [lineaInvestigacion, setLineaInvestigacion] = useState('')

  // Coautor
  const [busquedaCoautor, setBusquedaCoautor] = useState('')
  const [resultadosCoautor, setResultadosCoautor] = useState<Persona[]>([])
  const [coautorSeleccionado, setCoautorSeleccionado] = useState<Persona | null>(null)
  const [buscandoCoautor, setBuscandoCoautor] = useState(false)

  // Asesor
  const [busquedaAsesor, setBusquedaAsesor] = useState('')
  const [resultadosAsesor, setResultadosAsesor] = useState<Persona[]>([])
  const [asesorSeleccionado, setAsesorSeleccionado] = useState<Persona | null>(null)
  const [buscandoAsesor, setBuscandoAsesor] = useState(false)

  // Coasesor
  const [busquedaCoasesor, setBusquedaCoasesor] = useState('')
  const [resultadosCoasesor, setResultadosCoasesor] = useState<Persona[]>([])
  const [coasesorSeleccionado, setCoasesorSeleccionado] = useState<Persona | null>(null)
  const [buscandoCoasesor, setBuscandoCoasesor] = useState(false)

  // Estados generales
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Selección con validación cruzada de roles
  const seleccionarCoautor = (p: Persona) => {
    if (p.id === asesorSeleccionado?.id || p.id === coasesorSeleccionado?.id) {
      toast.error('Esta persona ya fue seleccionada como asesor o coasesor')
      return
    }
    setCoautorSeleccionado(p)
    setBusquedaCoautor('')
    setResultadosCoautor([])
  }

  const seleccionarAsesor = (p: Persona) => {
    if (p.id === coautorSeleccionado?.id) {
      toast.error('Esta persona ya fue seleccionada como tesista 2')
      return
    }
    if (p.id === coasesorSeleccionado?.id) {
      toast.error('Esta persona ya fue seleccionada como coasesor')
      return
    }
    setAsesorSeleccionado(p)
    setBusquedaAsesor('')
    setResultadosAsesor([])
  }

  const seleccionarCoasesor = (p: Persona) => {
    if (p.id === coautorSeleccionado?.id) {
      toast.error('Esta persona ya fue seleccionada como tesista 2')
      return
    }
    if (p.id === asesorSeleccionado?.id) {
      toast.error('Esta persona ya fue seleccionada como asesor')
      return
    }
    setCoasesorSeleccionado(p)
    setBusquedaCoasesor('')
    setResultadosCoasesor([])
  }

  // Carrera seleccionada completa
  const carreraActual = useMemo(() =>
    carreras.find((c) => c.id === carreraSeleccionada),
    [carreras, carreraSeleccionada]
  )

  // Calcular progreso
  const progress = useMemo(() => {
    let completed = 0
    if (carreraSeleccionada) completed += 25
    if (titulo.length >= 10) completed += 25
    if (asesorSeleccionado) completed += 25
    completed += 25 // El paso de confirmación siempre suma si llegamos ahí
    return Math.min(completed, currentStep === 4 ? 100 : completed - 25)
  }, [carreraSeleccionada, titulo, asesorSeleccionado, currentStep])

  // Validación por paso específico
  const isStepValid = useCallback((step: number): boolean => {
    switch (step) {
      case 1: {
        if (!carreraSeleccionada) return false
        const carreraSelec = carreras.find((c) => c.id === carreraSeleccionada)
        return !!carreraSelec && !carreraSelec.tesisActiva
      }
      case 2: return titulo.trim().length >= 10
      case 3: return !!asesorSeleccionado
      case 4: return true
      default: return false
    }
  }, [carreraSeleccionada, carreras, titulo, asesorSeleccionado])

  // Validación del paso actual
  const canProceed = useMemo(() => isStepValid(currentStep), [isStepValid, currentStep])

  // Verificar si se puede navegar a un paso: ya fue visitado O todos los pasos anteriores están válidos
  const canNavigateToStep = useCallback((step: number): boolean => {
    if (step === currentStep) return false
    if (step <= maxStepReached) return true
    // Permitir ir al siguiente paso si todos los anteriores están completos
    for (let i = 1; i < step; i++) {
      if (!isStepValid(i)) return false
    }
    return true
  }, [currentStep, maxStepReached, isStepValid])

  // Cargar carreras del estudiante
  useEffect(() => {
    if (!authLoading && user) {
      loadCarreras()
    }
  }, [authLoading, user])

  const loadCarreras = async () => {
    try {
      // Cargar carreras y tesis activas en paralelo
      const [profileData, tesisData] = await Promise.all([
        api.get<{ data: { carreras: Carrera[] } }>('/api/auth/profile'),
        api.get<{ data: any[] }>('/api/tesis?rol=autor'),
      ])

      if (profileData.data.carreras) {
        // Mapear las carreras con información de tesis activas
        const carrerasConTesis = profileData.data.carreras.map((carrera: Carrera) => {
          // Buscar si hay una tesis activa para esta carrera
          // Una tesis está activa si su estado NO es RECHAZADA ni ARCHIVADA
          const tesisActiva = tesisData.data?.find((t: any) => {
            const autorEnCarrera = t.autores?.some(
              (a: any) => a.studentCareer?.codigoEstudiante === carrera.codigoEstudiante
            )
            return autorEnCarrera && !['RECHAZADA', 'ARCHIVADA'].includes(t.estado)
          })

          return {
            ...carrera,
            tesisActiva: tesisActiva
              ? { id: tesisActiva.id, titulo: tesisActiva.titulo, estado: tesisActiva.estado }
              : null,
          }
        })

        setCarreras(carrerasConTesis)

        // Auto-seleccionar solo si hay una carrera disponible (sin tesis activa)
        const carrerasDisponibles = carrerasConTesis.filter((c: Carrera) => !c.tesisActiva)
        if (carrerasDisponibles.length === 1) {
          setCarreraSeleccionada(carrerasDisponibles[0].id)
        }
      }
    } catch {
      toast.error('Error al cargar carreras')
    } finally {
      setLoading(false)
    }
  }

  // Buscar coautor
  const buscarCoautor = useCallback(async (query: string) => {
    if (!carreraSeleccionada || query.length < 2) {
      setResultadosCoautor([])
      return
    }

    const carrera = carreras.find((c) => c.id === carreraSeleccionada)
    if (!carrera) return

    setBuscandoCoautor(true)
    try {
      const result = await api.get<{ data: Persona[] }>(
        `/api/tesis/buscar-estudiantes?carrera=${encodeURIComponent(carrera.carreraNombre)}&q=${encodeURIComponent(query)}`
      )
      // Excluir personas que ya fueron seleccionadas como asesor o coasesor
      const idsExcluir = [asesorSeleccionado?.id, coasesorSeleccionado?.id].filter(Boolean)
      setResultadosCoautor(result.data.filter(p => !idsExcluir.includes(p.id)))
    } catch {
      console.error('Error buscando coautor')
    } finally {
      setBuscandoCoautor(false)
    }
  }, [carreraSeleccionada, carreras])

  // Buscar docentes
  const buscarDocente = useCallback(async (query: string, tipo: 'asesor' | 'coasesor') => {
    if (query.length < 2) {
      if (tipo === 'asesor') setResultadosAsesor([])
      else setResultadosCoasesor([])
      return
    }

    if (tipo === 'asesor') setBuscandoAsesor(true)
    else setBuscandoCoasesor(true)

    try {
      const carrera = carreras.find((c) => c.id === carreraSeleccionada)
      const facultadParam = carrera ? `&facultadId=${carrera.facultadId}` : ''
      const result = await api.get<{ data: Persona[] }>(`/api/tesis/buscar-docentes?q=${encodeURIComponent(query)}${facultadParam}`)
      const filtrados = result.data.filter((d: Persona) => {
        // Excluir al coautor seleccionado (por si es también docente)
        if (d.id === coautorSeleccionado?.id) return false
        if (tipo === 'asesor') return d.id !== coasesorSeleccionado?.id
        return d.id !== asesorSeleccionado?.id
      })
      if (tipo === 'asesor') setResultadosAsesor(filtrados)
      else setResultadosCoasesor(filtrados)
    } catch {
      console.error('Error buscando docente')
    } finally {
      if (tipo === 'asesor') setBuscandoAsesor(false)
      else setBuscandoCoasesor(false)
    }
  }, [carreraSeleccionada, carreras, asesorSeleccionado, coasesorSeleccionado, coautorSeleccionado])

  // Debounce para búsquedas
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busquedaCoautor) buscarCoautor(busquedaCoautor)
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaCoautor, buscarCoautor])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busquedaAsesor) buscarDocente(busquedaAsesor, 'asesor')
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaAsesor, buscarDocente])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busquedaCoasesor) buscarDocente(busquedaCoasesor, 'coasesor')
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaCoasesor, buscarDocente])


  // Navegación por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Enter' && currentStep < 4 && canProceed) {
        e.preventDefault()
        setSlideDirection('right')
        setCurrentStep((s) => {
          const next = s + 1
          setMaxStepReached((prev) => Math.max(prev, next))
          return next
        })
      } else if (e.key === 'Escape' && currentStep > 1) {
        e.preventDefault()
        setSlideDirection('left')
        setCurrentStep((s) => s - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, canProceed])

  // Agregar palabra clave
  const agregarPalabraClave = () => {
    const palabra = nuevaPalabra.trim().toLowerCase()
    if (palabra && !palabrasClave.includes(palabra) && palabrasClave.length < 5) {
      setPalabrasClave([...palabrasClave, palabra])
      setNuevaPalabra('')
    }
  }

  // Guardar proyecto
  const guardarProyecto = async () => {
    if (!carreraSeleccionada || !titulo || !asesorSeleccionado) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setGuardando(true)
    try {
      const result = await api.post<{ data: { id: string } }>('/api/tesis', {
        titulo: titulo.trim(),
        resumen: resumen.trim() || null,
        palabrasClave,
        lineaInvestigacion: lineaInvestigacion.trim() || null,
        studentCareerId: carreraSeleccionada,
        coautorId: coautorSeleccionado?.id || null,
        asesorId: asesorSeleccionado.id,
        coasesorId: coasesorSeleccionado?.id || null,
      })
      toast.success('Proyecto creado exitosamente')
      router.push(`/mis-tesis/${result.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear proyecto')
    } finally {
      setGuardando(false)
    }
  }

  // Navegación del wizard
  const nextStep = () => {
    if (canProceed && currentStep < 4) {
      const next = currentStep + 1
      setSlideDirection('right')
      setCurrentStep(next)
      setMaxStepReached((prev) => Math.max(prev, next))
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setSlideDirection('left')
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4 && canNavigateToStep(step)) {
      setSlideDirection(step > currentStep ? 'right' : 'left')
      setCurrentStep(step)
      setMaxStepReached((prev) => Math.max(prev, step))
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando información...</p>
      </div>
    )
  }

  if (!hasRole('ESTUDIANTE')) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Esta sección es exclusiva para estudiantes.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (carreras.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sin Carreras Registradas</h2>
            <p className="text-muted-foreground mb-4">
              No tienes carreras asociadas a tu cuenta.
            </p>
            <Button variant="outline" asChild>
              <Link href="/mis-tesis">Volver</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FullscreenLoader
        visible={guardando}
        title="Creando tu proyecto"
        description="Registrando la información y notificando al asesor..."
      />
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Link href="/mis-tesis" className="hover:text-foreground transition-colors">Mis Tesis</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Nuevo Proyecto</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nuevo Proyecto de Tesis</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Completa los pasos para registrar tu proyecto</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/mis-tesis">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="rounded-xl border overflow-hidden">
              {/* Desktop Steps */}
              <div className="hidden md:flex">
                {STEPS.map((step, index) => {
                  const isCompleted = currentStep > step.id
                  const isCurrent = currentStep === step.id
                  const Icon = step.icon

                  return (
                    <button
                      key={step.id}
                      onClick={() => goToStep(step.id)}
                      disabled={!canNavigateToStep(step.id) && !isCurrent}
                      className={cn(
                        'flex-1 flex items-center gap-3 px-4 py-3.5 transition-all relative',
                        isCompleted && 'cursor-pointer hover:bg-muted/50',
                        isCurrent && 'bg-muted/30',
                        !isCompleted && !isCurrent && !canNavigateToStep(step.id) && 'opacity-40',
                        !isCompleted && !isCurrent && canNavigateToStep(step.id) && 'cursor-pointer hover:bg-muted/30',
                        index > 0 && 'border-l'
                      )}
                    >
                      {/* Bottom indicator for current */}
                      {isCurrent && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                      {isCompleted && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/30" />}

                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                        isCompleted && 'bg-primary/10 text-primary',
                        isCurrent && 'bg-primary text-primary-foreground',
                        !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                      )}>
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          'font-medium text-sm',
                          (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {step.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{step.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Mobile Progress */}
              <div className="md:hidden p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">
                    Paso {currentStep} de {STEPS.length}: {STEPS[currentStep - 1].title}
                  </span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between mt-3">
                  {STEPS.map((step) => {
                    const isActive = currentStep === step.id
                    const isDone = currentStep > step.id
                    const navigable = canNavigateToStep(step.id)
                    return (
                      <button
                        key={step.id}
                        type="button"
                        disabled={!navigable && !isActive}
                        onClick={() => goToStep(step.id)}
                        className={cn(
                          'flex flex-col items-center gap-1',
                          navigable && !isActive && 'cursor-pointer'
                        )}
                      >
                        <div className={cn(
                          'w-2.5 h-2.5 rounded-full transition-all',
                          isDone && 'bg-primary',
                          isActive && 'bg-primary ring-2 ring-primary/30',
                          !isDone && !isActive && navigable && 'bg-primary/40',
                          !isDone && !isActive && !navigable && 'bg-muted-foreground/30'
                        )} />
                        <span className={cn(
                          'text-[10px]',
                          isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                        )}>
                          {step.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <div
                key={currentStep}
                className={cn(
                  'space-y-6 animate-in fade-in duration-300',
                  slideDirection === 'right' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'
                )}
              >
              {/* Step 1: Carrera */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Selecciona tu Carrera</CardTitle>
                        <CardDescription>
                          El proyecto estará asociado a esta carrera profesional
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Verificar si todas las carreras ya tienen tesis */}
                    {carreras.every((c) => c.tesisActiva) ? (
                      <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-amber-800 dark:text-amber-200">
                              Ya tienes proyectos activos
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              Todas tus carreras ya tienen un proyecto de tesis activo. Solo puedes tener
                              un proyecto por carrera.
                            </p>
                            <Button variant="outline" size="sm" className="mt-3" asChild>
                              <Link href="/mis-tesis">Ver mis proyectos</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : carreras.length > 1 ? (
                      <div className="space-y-3">
                        {carreras.map((c) => {
                          const tieneTesis = !!c.tesisActiva
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => !tieneTesis && setCarreraSeleccionada(c.id)}
                              disabled={tieneTesis}
                              className={cn(
                                'w-full p-4 rounded-xl border-2 text-left transition-all',
                                tieneTesis
                                  ? 'border-muted bg-muted/30 cursor-not-allowed opacity-70'
                                  : carreraSeleccionada === c.id
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              )}
                            >
                              <div className="flex items-start gap-4">
                                <div className={cn(
                                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                                  tieneTesis
                                    ? 'bg-muted'
                                    : carreraSeleccionada === c.id
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                )}>
                                  <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    'font-semibold truncate',
                                    tieneTesis && 'text-muted-foreground'
                                  )}>
                                    {c.carreraNombre}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{c.facultad.nombre}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Código: {c.codigoEstudiante}
                                  </p>
                                  {tieneTesis && (
                                    <div className="mt-2 flex items-center gap-1.5">
                                      <Badge variant="secondary" className="text-xs">
                                        Tiene proyecto activo
                                      </Badge>
                                      <Link
                                        href={`/mis-tesis/${c.tesisActiva?.id}`}
                                        className="text-xs text-primary hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Ver proyecto
                                      </Link>
                                    </div>
                                  )}
                                </div>
                                {!tieneTesis && carreraSeleccionada === c.id && (
                                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : carreras[0].tesisActiva ? (
                      <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-amber-800 dark:text-amber-200">
                              Ya tienes un proyecto activo
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{carreras[0].carreraNombre}</p>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                              Solo puedes tener un proyecto de tesis por carrera.
                            </p>
                            <Button variant="outline" size="sm" className="mt-3" asChild>
                              <Link href={`/mis-tesis/${carreras[0].tesisActiva?.id}`}>
                                Ver mi proyecto
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{carreras[0].carreraNombre}</p>
                            <p className="text-sm text-muted-foreground">{carreras[0].facultad.nombre}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Código: {carreras[0].codigoEstudiante}
                            </p>
                          </div>
                          <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">
                        Solo puedes tener un proyecto de tesis activo por carrera. Solo podrás agregar coautores que pertenezcan a la misma carrera.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Información del Proyecto */}
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Información del Proyecto</CardTitle>
                        <CardDescription>
                          Describe tu proyecto de investigación
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="titulo" className="text-base font-medium">
                        Título del Proyecto <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="titulo"
                        placeholder="Ingresa el título completo de tu proyecto de tesis..."
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        rows={3}
                        className="resize-none text-base"
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn(
                          titulo.length < 10 ? 'text-muted-foreground' : titulo.length > 450 ? 'text-amber-600' : 'text-green-600'
                        )}>
                          {titulo.length >= 10 ? (
                            <span className="flex items-center gap-1">
                              <Check className="w-3 h-3" /> Título válido
                            </span>
                          ) : (
                            `${10 - titulo.length} caracteres más`
                          )}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <svg width="20" height="20" viewBox="0 0 20 20" className="rotate-[-90deg]">
                            <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" className="stroke-muted" />
                            <circle
                              cx="10" cy="10" r="8" fill="none" strokeWidth="2"
                              strokeDasharray={`${Math.min((titulo.length / 500) * 50.26, 50.26)} 50.26`}
                              strokeLinecap="round"
                              className={cn(
                                titulo.length < 10 ? 'stroke-muted-foreground' : titulo.length > 450 ? 'stroke-amber-500' : 'stroke-green-500'
                              )}
                            />
                          </svg>
                          <span className="text-muted-foreground">{titulo.length}/500</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="resumen" className="text-base font-medium">
                        Resumen <Badge variant="outline" className="ml-2 font-normal">Opcional</Badge>
                      </Label>
                      <Textarea
                        id="resumen"
                        placeholder="Describe brevemente el objetivo y alcance de tu investigación..."
                        value={resumen}
                        onChange={(e) => setResumen(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linea" className="text-base font-medium">
                        Línea de Investigación <Badge variant="outline" className="ml-2 font-normal">Opcional</Badge>
                      </Label>
                      <Input
                        id="linea"
                        placeholder="Ej: Inteligencia Artificial, Desarrollo Sostenible..."
                        value={lineaInvestigacion}
                        onChange={(e) => setLineaInvestigacion(e.target.value)}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Palabras Clave <Badge variant="outline" className="ml-2 font-normal">Máx. 5</Badge>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Agregar palabra clave..."
                          value={nuevaPalabra}
                          onChange={(e) => setNuevaPalabra(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarPalabraClave())}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={agregarPalabraClave}
                          disabled={!nuevaPalabra.trim() || palabrasClave.length >= 5}
                          size="icon"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {palabrasClave.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {palabrasClave.map((p, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 px-3 py-1.5">
                              {p}
                              <button
                                type="button"
                                onClick={() => setPalabrasClave(palabrasClave.filter((_, idx) => idx !== i))}
                                className="ml-1 hover:text-destructive transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Equipo */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* Tesista 2 */}
                  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <UserPlus className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>Tesista 2</CardTitle>
                            <Badge variant="outline">Opcional</Badge>
                          </div>
                          <CardDescription>
                            Si tu tesis es en pareja, agrega a tu compañero
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {coautorSeleccionado ? (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                            <User className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{coautorSeleccionado.nombreCompleto}</p>
                            <p className="text-sm text-muted-foreground truncate">{coautorSeleccionado.email}</p>
                            <p className="text-xs text-muted-foreground">{coautorSeleccionado.codigoEstudiante}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCoautorSeleccionado(null)}
                            className="flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar por nombre o documento..."
                              className="pl-10"
                              value={busquedaCoautor}
                              onChange={(e) => setBusquedaCoautor(e.target.value)}
                            />
                            {buscandoCoautor && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                            )}
                          </div>
                          {resultadosCoautor.length > 0 && (
                            <div className="border rounded-xl divide-y overflow-hidden max-h-48 overflow-y-auto">
                              {resultadosCoautor.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full p-3 text-left hover:bg-muted transition-colors flex items-center gap-3 cursor-pointer"
                                  onClick={() => seleccionarCoautor(p)}
                                >
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{p.nombreCompleto}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {p.codigoEstudiante} • {p.email}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                          {busquedaCoautor.length >= 2 && !buscandoCoautor && resultadosCoautor.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-6 text-center">
                              <Search className="w-8 h-8 text-muted-foreground/40" />
                              <p className="text-sm text-muted-foreground">
                                No se encontraron estudiantes para &ldquo;{busquedaCoautor}&rdquo;
                              </p>
                              <p className="text-xs text-muted-foreground/70">Verifica el nombre o documento</p>
                            </div>
                          )}
                    </CardContent>
                  </Card>

                  {/* Asesor */}
                  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100 fill-mode-backwards">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>Asesor</CardTitle>
                            <Badge variant="destructive" className="font-normal">Requerido</Badge>
                          </div>
                          <CardDescription>
                            Selecciona al docente que dirigirá tu tesis
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {asesorSeleccionado ? (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{asesorSeleccionado.nombreCompleto}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {asesorSeleccionado.departamento || asesorSeleccionado.facultad}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{asesorSeleccionado.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAsesorSeleccionado(null)}
                            className="flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar docente por nombre..."
                              className="pl-10"
                              value={busquedaAsesor}
                              onChange={(e) => setBusquedaAsesor(e.target.value)}
                            />
                            {buscandoAsesor && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                            )}
                          </div>
                          {resultadosAsesor.length > 0 && (
                            <div className="border rounded-xl divide-y overflow-hidden max-h-48 overflow-y-auto">
                              {resultadosAsesor.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full p-3 text-left hover:bg-muted transition-colors flex items-center gap-3 cursor-pointer"
                                  onClick={() => seleccionarAsesor(p)}
                                >
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <GraduationCap className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{p.nombreCompleto}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {p.departamento || p.facultad || p.email}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                          {busquedaAsesor.length >= 2 && !buscandoAsesor && resultadosAsesor.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-6 text-center">
                              <Search className="w-8 h-8 text-muted-foreground/40" />
                              <p className="text-sm text-muted-foreground">
                                No se encontraron docentes para &ldquo;{busquedaAsesor}&rdquo;
                              </p>
                              <p className="text-xs text-muted-foreground/70">Verifica el nombre del docente</p>
                            </div>
                          )}
                    </CardContent>
                  </Card>

                  {/* Coasesor */}
                  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200 fill-mode-backwards">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>Coasesor</CardTitle>
                            <Badge variant="outline">Opcional</Badge>
                          </div>
                          <CardDescription>
                            Agrega un coasesor si lo requieres
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {coasesorSeleccionado ? (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{coasesorSeleccionado.nombreCompleto}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {coasesorSeleccionado.departamento || coasesorSeleccionado.facultad}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{coasesorSeleccionado.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCoasesorSeleccionado(null)}
                            className="flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar docente por nombre..."
                              className="pl-10"
                              value={busquedaCoasesor}
                              onChange={(e) => setBusquedaCoasesor(e.target.value)}
                            />
                            {buscandoCoasesor && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                            )}
                          </div>
                          {resultadosCoasesor.length > 0 && (
                            <div className="border rounded-xl divide-y overflow-hidden max-h-48 overflow-y-auto">
                              {resultadosCoasesor.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full p-3 text-left hover:bg-muted transition-colors flex items-center gap-3 cursor-pointer"
                                  onClick={() => seleccionarCoasesor(p)}
                                >
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <Users className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{p.nombreCompleto}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {p.departamento || p.facultad || p.email}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                          {busquedaCoasesor.length >= 2 && !buscandoCoasesor && resultadosCoasesor.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-6 text-center">
                              <Search className="w-8 h-8 text-muted-foreground/40" />
                              <p className="text-sm text-muted-foreground">
                                No se encontraron docentes para &ldquo;{busquedaCoasesor}&rdquo;
                              </p>
                              <p className="text-xs text-muted-foreground/70">Verifica el nombre del docente</p>
                            </div>
                          )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 4: Confirmación */}
              {currentStep === 4 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle>Confirmar y Crear</CardTitle>
                        <CardDescription>
                          Revisa la información antes de crear tu proyecto
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Resumen */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Carrera</p>
                          <button type="button" onClick={() => goToStep(1)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">
                            <Pencil className="w-3 h-3" />
                            Editar
                          </button>
                        </div>
                        <div>
                          <p className="font-medium">{carreraActual?.carreraNombre}</p>
                          <p className="text-sm text-muted-foreground">{carreraActual?.facultad.nombre}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Proyecto</p>
                          <button type="button" onClick={() => goToStep(2)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">
                            <Pencil className="w-3 h-3" />
                            Editar
                          </button>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Título</p>
                          <p className="font-medium">{titulo}</p>
                        </div>
                        {resumen && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Resumen</p>
                            <p className="text-sm text-muted-foreground">{resumen}</p>
                          </div>
                        )}
                        {lineaInvestigacion && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Línea de Investigación</p>
                            <p className="text-sm">{lineaInvestigacion}</p>
                          </div>
                        )}
                        {palabrasClave.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Palabras Clave</p>
                            <div className="flex flex-wrap gap-1.5">
                              {palabrasClave.map((p, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Equipo de Investigación</p>
                          <button type="button" onClick={() => goToStep(3)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">
                            <Pencil className="w-3 h-3" />
                            Editar
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{user?.nombres} {user?.apellidoPaterno}</p>
                            <p className="text-xs text-muted-foreground">Tesista 1</p>
                          </div>
                        </div>

                        {coautorSeleccionado && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{coautorSeleccionado.nombreCompleto}</p>
                              <p className="text-xs text-muted-foreground">Tesista 2</p>
                            </div>
                          </div>
                        )}

                        <Separator className="my-2" />

                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{asesorSeleccionado?.nombreCompleto}</p>
                            <p className="text-xs text-muted-foreground">Asesor</p>
                          </div>
                        </div>

                        {coasesorSeleccionado && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                              <Users className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{coasesorSeleccionado.nombreCompleto}</p>
                              <p className="text-xs text-muted-foreground">Coasesor</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">
                        Después de crear el proyecto, deberás subir los documentos requeridos (proyecto PDF, carta de aceptación del asesor) antes de enviarlo a revisión.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={cn(currentStep === 1 && 'invisible')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>

                {currentStep < 4 ? (
                  <Button onClick={nextStep} disabled={!canProceed}>
                    Siguiente
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={guardarProyecto}
                    disabled={guardando}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {guardando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Crear Proyecto
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="hidden md:flex items-center justify-center gap-3 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">Enter</kbd> Siguiente</span>
                <span>·</span>
                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">Esc</kbd> Anterior</span>
              </div>
              </div>
            </div>

            {/* Sidebar - Summary */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Resumen del Proyecto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Carrera */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        carreraSeleccionada ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted'
                      )}>
                        {carreraSeleccionada ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Carrera</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {carreraActual?.carreraNombre || 'Sin seleccionar'}
                        </p>
                      </div>
                    </div>

                    {/* Título */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        titulo.length >= 10 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted'
                      )}>
                        {titulo.length >= 10 ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Título</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {titulo || 'Sin definir'}
                        </p>
                      </div>
                    </div>

                    {/* Asesor */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        asesorSeleccionado ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted'
                      )}>
                        {asesorSeleccionado ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Asesor</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {asesorSeleccionado?.nombreCompleto || 'Sin seleccionar'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Opcionales */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Opcionales</p>

                      <div className="flex items-center gap-2 text-sm">
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center',
                          coautorSeleccionado ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-muted'
                        )}>
                          {coautorSeleccionado ? (
                            <Check className="w-3 h-3 text-blue-600" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                          )}
                        </div>
                        <span className={coautorSeleccionado ? 'text-foreground' : 'text-muted-foreground'}>
                          Tesista 2
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center',
                          coasesorSeleccionado ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-muted'
                        )}>
                          {coasesorSeleccionado ? (
                            <Check className="w-3 h-3 text-purple-600" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                          )}
                        </div>
                        <span className={coasesorSeleccionado ? 'text-foreground' : 'text-muted-foreground'}>
                          Coasesor
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tips */}
                <div key={currentStep} className="rounded-xl border bg-muted/30 p-4 animate-in fade-in duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Info className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-0.5">{STEP_TIPS[currentStep].titulo}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {STEP_TIPS[currentStep].descripcion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
        </div>
      </div>
    </div>
  )
}
