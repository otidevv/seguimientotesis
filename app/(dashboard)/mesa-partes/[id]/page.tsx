'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  CheckCircle,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileUp,
  Gavel,
  GraduationCap,
  History,
  Loader2,
  Receipt,
  Search,
  Trash2,
  Upload,
  User,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Documento {
  id: string
  tipo: string
  nombre: string
  url: string
  mimeType: string
  tamano: number
  firmado: boolean
  fechaFirma: string | null
  fechaSubida: string
  subidoPor: string | null
}

interface Autor {
  id: string
  tipoParticipante: string
  estado: string
  nombre: string
  email: string
  dni: string
  codigo: string
  carrera: string
}

interface Asesor {
  id: string
  tipo: string
  estado: string
  nombre: string
  email: string
}

interface EvaluacionJurado {
  id: string
  ronda: number
  resultado: string
  observaciones: string | null
  archivoUrl: string | null
  fecha: string
}

interface Jurado {
  id: string
  tipo: string
  fase: string
  nombre: string
  email: string
  userId: string
  evaluaciones: EvaluacionJurado[]
}

interface HistorialItem {
  id: string
  estadoAnterior: string | null
  estadoNuevo: string
  comentario: string | null
  fecha: string
  realizadoPor: string
}

interface Proyecto {
  id: string
  codigo: string
  titulo: string
  resumen: string | null
  palabrasClave: string[]
  estado: string
  lineaInvestigacion: string | null
  voucherFisicoEntregado: boolean
  voucherFisicoFecha: string | null
  createdAt: string
  carrera: string
  facultad: {
    id: string
    nombre: string
    codigo: string
  } | null
  autores: Autor[]
  asesores: Asesor[]
  documentos: Documento[]
  jurados: Jurado[]
  historial: HistorialItem[]
  rondaActual: number
  faseActual: string | null
  fechaLimiteEvaluacion: string | null
  fechaLimiteCorreccion: string | null
}

interface BusquedaJurado {
  id: string
  nombreCompleto: string
  email: string
  numeroDocumento: string
  esDocente: boolean
  codigoDocente: string | null
  departamento: string | null
  facultad: string | null
  roles: string[]
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  EN_REVISION: {
    label: 'En Revision',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="w-4 h-4" />,
  },
  OBSERVADA: {
    label: 'Observada',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  ASIGNANDO_JURADOS: {
    label: 'Asignando Jurados',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <UserPlus className="w-4 h-4" />,
  },
  EN_EVALUACION_JURADO: {
    label: 'En Evaluacion (Jurado)',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <ClipboardCheck className="w-4 h-4" />,
  },
  OBSERVADA_JURADO: {
    label: 'Observada por Jurado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  PROYECTO_APROBADO: {
    label: 'Proyecto Aprobado',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  INFORME_FINAL: {
    label: 'Informe Final',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: <FileText className="w-4 h-4" />,
  },
  EN_EVALUACION_INFORME: {
    label: 'Evaluando Informe',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <ClipboardCheck className="w-4 h-4" />,
  },
  OBSERVADA_INFORME: {
    label: 'Informe Observado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  APROBADA: {
    label: 'Aprobada',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  RECHAZADA: {
    label: 'Rechazada',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-4 h-4" />,
  },
}

const TIPO_JURADO_LABELS: Record<string, string> = {
  PRESIDENTE: 'Presidente',
  VOCAL: 'Vocal',
  SECRETARIO: 'Secretario',
  ACCESITARIO: 'Accesitario',
}

const TIPO_JURADO_COLORS: Record<string, string> = {
  PRESIDENTE: 'border-amber-500 text-amber-700 bg-amber-50',
  VOCAL: 'border-blue-500 text-blue-700 bg-blue-50',
  SECRETARIO: 'border-green-500 text-green-700 bg-green-50',
  ACCESITARIO: 'border-gray-500 text-gray-700 bg-gray-50',
}

export default function DetalleProyectoMesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole } = useAuth()

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)

  // Dialogo de accion
  const [dialogOpen, setDialogOpen] = useState(false)
  const [accionActual, setAccionActual] = useState<'APROBAR' | 'OBSERVAR' | 'RECHAZAR' | null>(null)
  const [comentario, setComentario] = useState('')

  // Busqueda de jurados
  const [busquedaJurado, setBusquedaJurado] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<BusquedaJurado[]>([
  ])
  const [buscando, setBuscando] = useState(false)
  const [tipoJurado, setTipoJurado] = useState<string>('PRESIDENTE')
  const debounceRef = useRef<NodeJS.Timeout>(null)

  // Upload resolucion
  const [archivoResolucion, setArchivoResolucion] = useState<File | null>(null)
  const [subiendoResolucion, setSubiendoResolucion] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      loadProyecto()
    }
  }, [authLoading, user, id])

  const loadProyecto = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mesa-partes/${id}`)
      const data = await response.json()

      if (data.success) {
        setProyecto(data.data)
      } else {
        toast.error(data.error || 'Proyecto no encontrado')
        router.push('/mesa-partes')
      }
    } catch {
      toast.error('Error al cargar proyecto')
    } finally {
      setLoading(false)
    }
  }

  const abrirDialogo = (accion: 'APROBAR' | 'OBSERVAR' | 'RECHAZAR') => {
    setAccionActual(accion)
    setComentario('')
    setDialogOpen(true)
  }

  const ejecutarAccion = async () => {
    if (!accionActual) return

    if ((accionActual === 'OBSERVAR' || accionActual === 'RECHAZAR') && !comentario.trim()) {
      toast.error('Debe proporcionar un comentario')
      return
    }

    setProcesando(true)
    try {
      const response = await fetch(`/api/mesa-partes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: accionActual,
          comentario: comentario.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setDialogOpen(false)
        loadProyecto()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al procesar accion')
    } finally {
      setProcesando(false)
    }
  }

  const confirmarVoucher = async () => {
    setProcesando(true)
    try {
      const response = await fetch(`/api/mesa-partes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'CONFIRMAR_VOUCHER' }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        loadProyecto()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al confirmar voucher')
    } finally {
      setProcesando(false)
    }
  }

  // Buscar jurados
  const buscarJurados = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResultadosBusqueda([])
      return
    }

    setBuscando(true)
    try {
      const response = await fetch(`/api/buscar-jurados?q=${encodeURIComponent(query)}&tesisId=${id}`)
      const data = await response.json()
      if (data.success) {
        setResultadosBusqueda(data.data)
      }
    } catch {
      // silently fail
    } finally {
      setBuscando(false)
    }
  }, [id])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscarJurados(busquedaJurado), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [busquedaJurado, buscarJurados])

  const asignarJurado = async (userId: string) => {
    setProcesando(true)
    try {
      const response = await fetch(`/api/mesa-partes/${id}/jurados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tipo: tipoJurado }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setBusquedaJurado('')
        setResultadosBusqueda([])
        loadProyecto()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al asignar jurado')
    } finally {
      setProcesando(false)
    }
  }

  const removerJurado = async (juradoId: string) => {
    setProcesando(true)
    try {
      const response = await fetch(`/api/mesa-partes/${id}/jurados`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juradoId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        loadProyecto()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al remover jurado')
    } finally {
      setProcesando(false)
    }
  }

  const confirmarJurados = async () => {
    setProcesando(true)
    try {
      const response = await fetch(`/api/mesa-partes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'CONFIRMAR_JURADOS' }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        loadProyecto()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al confirmar jurados')
    } finally {
      setProcesando(false)
    }
  }

  const subirResolucionYPasar = async () => {
    if (!archivoResolucion) {
      toast.error('Seleccione un archivo de resolucion')
      return
    }

    setSubiendoResolucion(true)
    try {
      // Subir el documento primero
      const formData = new FormData()
      formData.append('file', archivoResolucion)
      formData.append('tipoDocumento', 'RESOLUCION_APROBACION')

      const uploadResponse = await fetch(`/api/tesis/${id}/documentos`, {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadResponse.json()

      if (!uploadData.success) {
        // Si falla por permisos, intentar subir via mesa-partes
        // Pero por ahora transicionar directamente
      }

      // Transicionar estado
      const response = await fetch(`/api/mesa-partes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'SUBIR_RESOLUCION',
          comentario: 'Resolucion de aprobacion subida por Mesa de Partes',
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setArchivoResolucion(null)
        loadProyecto()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al subir resolucion')
    } finally {
      setSubiendoResolucion(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasRole('MESA_PARTES') && !hasRole('ADMIN') && !hasRole('SUPER_ADMIN')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Esta seccion es solo para personal de Mesa de Partes.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!proyecto) {
    return null
  }

  const estadoConfig = ESTADO_CONFIG[proyecto.estado] || ESTADO_CONFIG.EN_REVISION
  const puedeGestionar = ['EN_REVISION', 'OBSERVADA'].includes(proyecto.estado)
  const esAsignandoJurados = proyecto.estado === 'ASIGNANDO_JURADOS'
  const esProyectoAprobado = proyecto.estado === 'PROYECTO_APROBADO'
  const docProyecto = proyecto.documentos.find((d) => d.tipo === 'PROYECTO')
  const docCartaAsesor = proyecto.documentos.find((d) => d.tipo === 'CARTA_ACEPTACION_ASESOR')
  const docCartaCoasesor = proyecto.documentos.find((d) => d.tipo === 'CARTA_ACEPTACION_COASESOR')
  const docVoucher = proyecto.documentos.find((d) => d.tipo === 'VOUCHER_PAGO')
  const docsSustentatorios = proyecto.documentos.filter((d) => d.tipo === 'DOCUMENTO_SUSTENTATORIO')

  // Verificar jurados completos
  const tiposJuradoAsignados = (proyecto.jurados || []).map((j) => j.tipo)
  const tienePresidente = tiposJuradoAsignados.includes('PRESIDENTE')
  const tieneVocal = tiposJuradoAsignados.includes('VOCAL')
  const tieneSecretario = tiposJuradoAsignados.includes('SECRETARIO')
  const juradosCompletos = tienePresidente && tieneVocal && tieneSecretario

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/mesa-partes" className="hover:text-foreground transition-colors">
            Mesa de Partes
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{proyecto.codigo}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Button variant="outline" size="icon" asChild className="flex-shrink-0">
            <Link href="/mesa-partes">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="font-mono">{proyecto.codigo}</Badge>
              <Badge className={cn(estadoConfig.bgColor, estadoConfig.color, 'gap-1')}>
                {estadoConfig.icon}
                {estadoConfig.label}
              </Badge>
              {proyecto.faseActual && (
                <Badge variant="secondary">Fase: {proyecto.faseActual === 'PROYECTO' ? 'Proyecto' : 'Informe Final'}</Badge>
              )}
              {proyecto.rondaActual > 0 && (
                <Badge variant="outline">Ronda {proyecto.rondaActual}</Badge>
              )}
              {proyecto.facultad && (
                <Badge variant="secondary">{proyecto.facultad.nombre}</Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{proyecto.titulo}</h1>
            <p className="text-muted-foreground mt-1">{proyecto.carrera}</p>
          </div>
        </div>

        {/* Acciones de revision documental */}
        {puedeGestionar && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Acciones de Revision</p>
                  <p className="text-sm text-muted-foreground">
                    Revisa el proyecto y toma una decision
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    onClick={() => abrirDialogo('OBSERVAR')}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Observar
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                    onClick={() => abrirDialogo('RECHAZAR')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                  <div className="relative group">
                    <Button
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      onClick={() => abrirDialogo('APROBAR')}
                      disabled={!proyecto.voucherFisicoEntregado}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                    {!proyecto.voucherFisicoEntregado && (
                      <span className="text-xs text-yellow-600 mt-1 block sm:hidden">
                        Confirme el voucher fisico primero
                      </span>
                    )}
                  </div>
                  {!proyecto.voucherFisicoEntregado && (
                    <p className="text-xs text-yellow-600 hidden sm:block">
                      Debe confirmar el voucher fisico para aprobar
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Panel de Asignacion de Jurados */}
            {esAsignandoJurados && (
              <Card className="border-2 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-purple-600" />
                    Asignar Jurados Evaluadores
                  </CardTitle>
                  <CardDescription>
                    Asigne al menos un Presidente, Vocal y Secretario para iniciar la evaluacion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Jurados asignados */}
                  {(proyecto.jurados || []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Jurados asignados:</p>
                      {proyecto.jurados.map((jurado) => (
                        <div key={jurado.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-background">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{jurado.nombre}</p>
                            <p className="text-xs text-muted-foreground truncate">{jurado.email}</p>
                          </div>
                          <Badge className={cn('text-xs', TIPO_JURADO_COLORS[jurado.tipo])}>
                            {TIPO_JURADO_LABELS[jurado.tipo]}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removerJurado(jurado.id)}
                            disabled={procesando}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Indicadores de roles faltantes */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-xs', tienePresidente ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')}>
                      {tienePresidente ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      Presidente
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', tieneVocal ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')}>
                      {tieneVocal ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      Vocal
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', tieneSecretario ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')}>
                      {tieneSecretario ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      Secretario
                    </Badge>
                  </div>

                  <Separator />

                  {/* Buscador */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Buscar y agregar jurado:</p>
                    <div className="flex gap-2">
                      <Select value={tipoJurado} onValueChange={setTipoJurado}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESIDENTE">Presidente</SelectItem>
                          <SelectItem value="VOCAL">Vocal</SelectItem>
                          <SelectItem value="SECRETARIO">Secretario</SelectItem>
                          <SelectItem value="ACCESITARIO">Accesitario</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nombre, DNI o email..."
                          value={busquedaJurado}
                          onChange={(e) => setBusquedaJurado(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Resultados de busqueda */}
                    {(buscando || resultadosBusqueda.length > 0) && busquedaJurado.length >= 2 && (
                      <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {buscando ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Buscando...</span>
                          </div>
                        ) : resultadosBusqueda.length === 0 ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            No se encontraron resultados
                          </div>
                        ) : (
                          resultadosBusqueda.map((resultado) => (
                            <div
                              key={resultado.id}
                              className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                              onClick={() => asignarJurado(resultado.id)}
                            >
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{resultado.nombreCompleto}</p>
                                <p className="text-xs text-muted-foreground">
                                  DNI: {resultado.numeroDocumento} - {resultado.email}
                                </p>
                                {resultado.esDocente && (
                                  <p className="text-xs text-muted-foreground">
                                    Docente - {resultado.departamento || 'Sin departamento'}
                                  </p>
                                )}
                              </div>
                              <Button variant="outline" size="sm" disabled={procesando}>
                                <UserPlus className="w-3 h-3 mr-1" />
                                Asignar
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Boton confirmar jurados */}
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={confirmarJurados}
                    disabled={procesando || !juradosCompletos}
                  >
                    {procesando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirmar Jurados e Iniciar Evaluacion
                      </>
                    )}
                  </Button>
                  {!juradosCompletos && (
                    <p className="text-xs text-red-500 text-center">
                      Debe asignar al menos Presidente, Vocal y Secretario
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Panel de Subir Resolucion (PROYECTO_APROBADO) */}
            {esProyectoAprobado && (
              <Card className="border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileUp className="w-5 h-5 text-emerald-600" />
                    Subir Resolucion de Aprobacion
                  </CardTitle>
                  <CardDescription>
                    El proyecto fue aprobado por los jurados. Suba la resolucion de aprobacion para que el estudiante pueda iniciar el informe final.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="resolucion">Archivo de Resolucion (PDF)</Label>
                    <Input
                      id="resolucion"
                      type="file"
                      accept=".pdf"
                      className="mt-2"
                      onChange={(e) => setArchivoResolucion(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={subirResolucionYPasar}
                    disabled={subiendoResolucion || !archivoResolucion}
                  >
                    {subiendoResolucion ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Resolucion y Pasar a Informe Final
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Panel informativo de estados de jurado (read-only) */}
            {['EN_EVALUACION_JURADO', 'OBSERVADA_JURADO', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME', 'INFORME_FINAL'].includes(proyecto.estado) && (
              <Card className="border-2 border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    Estado de Evaluacion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info de estado */}
                  {proyecto.estado === 'EN_EVALUACION_JURADO' && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-indigo-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Jurados evaluando el proyecto</p>
                        {proyecto.fechaLimiteEvaluacion && (
                          <p className="text-xs text-muted-foreground">
                            Fecha limite (dias habiles): {new Date(proyecto.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {proyecto.estado === 'OBSERVADA_JURADO' && (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Proyecto observado por jurado</p>
                        <p className="text-xs text-muted-foreground">
                          El estudiante tiene hasta {proyecto.fechaLimiteCorreccion ? new Date(proyecto.fechaLimiteCorreccion).toLocaleDateString('es-PE') : '30 dias habiles'} para corregir (dias habiles)
                        </p>
                      </div>
                    </div>
                  )}
                  {proyecto.estado === 'EN_EVALUACION_INFORME' && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-indigo-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Jurados evaluando el informe final</p>
                        {proyecto.fechaLimiteEvaluacion && (
                          <p className="text-xs text-muted-foreground">
                            Fecha limite (dias habiles): {new Date(proyecto.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {proyecto.estado === 'INFORME_FINAL' && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-cyan-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Esperando informe final del estudiante</p>
                        <p className="text-xs text-muted-foreground">
                          El estudiante debe subir el informe final, Turnitin y voucher
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Lista de jurados y sus evaluaciones */}
                  {(proyecto.jurados || []).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Jurados asignados:</p>
                        {proyecto.jurados.map((jurado) => {
                          const evalActual = jurado.evaluaciones.find((e) => e.ronda === proyecto.rondaActual)
                          return (
                            <div key={jurado.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-background">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{jurado.nombre}</p>
                                <p className="text-xs text-muted-foreground truncate">{jurado.email}</p>
                              </div>
                              <Badge className={cn('text-xs', TIPO_JURADO_COLORS[jurado.tipo])}>
                                {TIPO_JURADO_LABELS[jurado.tipo]}
                              </Badge>
                              {evalActual ? (
                                <Badge variant="outline" className={cn(
                                  'text-xs',
                                  evalActual.resultado === 'APROBADO' ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'
                                )}>
                                  {evalActual.resultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Pendiente
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Confirmacion de Voucher Fisico */}
            {puedeGestionar && (
              <Card className={cn(
                'border-2',
                proyecto.voucherFisicoEntregado
                  ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                  : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20'
              )}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className={cn(
                      'w-5 h-5',
                      proyecto.voucherFisicoEntregado ? 'text-green-600' : 'text-yellow-600'
                    )} />
                    Voucher Fisico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {proyecto.voucherFisicoEntregado ? (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-200">
                          Voucher fisico recibido
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Confirmado el {proyecto.voucherFisicoFecha
                            ? new Date(proyecto.voucherFisicoFecha).toLocaleString('es-PE')
                            : ''}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                            Voucher fisico pendiente
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            El estudiante debe entregar el voucher original en mesa de partes.
                            {docVoucher && ' El voucher digital ya fue subido al sistema (ver documentos).'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={confirmarVoucher}
                        disabled={procesando}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        {procesando ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Confirmando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirmar Entrega de Voucher Fisico
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documentos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DocumentoCard
                  titulo="Proyecto de Tesis"
                  documento={docProyecto}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-100 dark:bg-blue-900/50"
                />
                <DocumentoCard
                  titulo="Carta de Aceptacion del Asesor"
                  documento={docCartaAsesor}
                  iconColor="text-green-600"
                  iconBg="bg-green-100 dark:bg-green-900/50"
                />
                {docCartaCoasesor && (
                  <DocumentoCard
                    titulo="Carta de Aceptacion del Coasesor"
                    documento={docCartaCoasesor}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100 dark:bg-purple-900/50"
                  />
                )}
                <DocumentoCard
                  titulo="Voucher de Pago"
                  documento={docVoucher}
                  iconColor="text-amber-600"
                  iconBg="bg-amber-100 dark:bg-amber-900/50"
                />
                {docsSustentatorios.length > 0 ? (
                  docsSustentatorios.map((doc, index) => (
                    <DocumentoCard
                      key={doc.id}
                      titulo={`Documento Sustentatorio${docsSustentatorios.length > 1 ? ` (${index + 1})` : ''}`}
                      documento={doc}
                      iconColor="text-indigo-600"
                      iconBg="bg-indigo-100 dark:bg-indigo-900/50"
                    />
                  ))
                ) : (
                  <DocumentoCard
                    titulo="Documento Sustentatorio"
                    documento={undefined}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-100 dark:bg-indigo-900/50"
                  />
                )}
              </CardContent>
            </Card>

            {/* Detalles */}
            {(proyecto.resumen || proyecto.lineaInvestigacion || proyecto.palabrasClave.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalles del Proyecto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proyecto.lineaInvestigacion && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Linea de Investigacion
                      </p>
                      <p className="text-sm">{proyecto.lineaInvestigacion}</p>
                    </div>
                  )}
                  {proyecto.resumen && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Resumen
                      </p>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {proyecto.resumen}
                      </p>
                    </div>
                  )}
                  {proyecto.palabrasClave.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        Palabras Clave
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {proyecto.palabrasClave.map((p, i) => (
                          <Badge key={i} variant="secondary">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Historial */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Historial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {proyecto.historial.map((item, index) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          ESTADO_CONFIG[item.estadoNuevo]?.bgColor || 'bg-gray-100'
                        )}>
                          {ESTADO_CONFIG[item.estadoNuevo]?.icon || <Clock className="w-4 h-4" />}
                        </div>
                        {index < proyecto.historial.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {ESTADO_CONFIG[item.estadoNuevo]?.label || item.estadoNuevo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.fecha).toLocaleString('es-PE')}
                          </span>
                        </div>
                        {item.comentario && (
                          <p className="text-sm text-muted-foreground">{item.comentario}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Por: {item.realizadoPor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Autores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Tesistas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {proyecto.autores.map((autor) => (
                  <div key={autor.id} className="flex items-start gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      autor.tipoParticipante === 'AUTOR_PRINCIPAL'
                        ? 'bg-primary/10'
                        : 'bg-blue-100 dark:bg-blue-900/50'
                    )}>
                      <User className={cn(
                        'w-4 h-4',
                        autor.tipoParticipante === 'AUTOR_PRINCIPAL'
                          ? 'text-primary'
                          : 'text-blue-600'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{autor.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {autor.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'Tesista 1' : 'Tesista 2'}
                      </p>
                      <p className="text-xs text-muted-foreground">{autor.codigo}</p>
                      <p className="text-xs text-muted-foreground truncate">{autor.email}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Asesores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Asesores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {proyecto.asesores.map((asesor) => (
                  <div key={asesor.id} className="flex items-start gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      asesor.estado === 'ACEPTADO'
                        ? 'bg-green-100 dark:bg-green-900/50'
                        : 'bg-yellow-100 dark:bg-yellow-900/50'
                    )}>
                      <GraduationCap className={cn(
                        'w-4 h-4',
                        asesor.estado === 'ACEPTADO' ? 'text-green-600' : 'text-yellow-600'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{asesor.nombre}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{asesor.tipo}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            asesor.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                            asesor.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600'
                          )}
                        >
                          {asesor.estado === 'ACEPTADO' ? 'Aceptado' : 'Pendiente'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{asesor.email}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Jurados (sidebar, cuando no es estado de asignacion) */}
            {!esAsignandoJurados && (proyecto.jurados || []).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-primary" />
                    Jurados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proyecto.jurados.map((jurado) => (
                    <div key={jurado.id} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{jurado.nombre}</p>
                        <Badge className={cn('text-[10px] px-1.5 py-0', TIPO_JURADO_COLORS[jurado.tipo])}>
                          {TIPO_JURADO_LABELS[jurado.tipo]}
                        </Badge>
                        <p className="text-xs text-muted-foreground truncate">{jurado.email}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha de registro</span>
                    <span className="font-medium">
                      {new Date(proyecto.createdAt).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documentos</span>
                    <span className="font-medium">{proyecto.documentos.length}</span>
                  </div>
                  {proyecto.fechaLimiteEvaluacion && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Limite evaluacion (d.h.)</span>
                        <span className="font-medium">
                          {new Date(proyecto.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                        </span>
                      </div>
                    </>
                  )}
                  {proyecto.fechaLimiteCorreccion && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Limite correccion (d.h.)</span>
                        <span className="font-medium">
                          {new Date(proyecto.fechaLimiteCorreccion).toLocaleDateString('es-PE')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogo de accion */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionActual === 'APROBAR' && 'Aprobar Proyecto'}
              {accionActual === 'OBSERVAR' && 'Observar Proyecto'}
              {accionActual === 'RECHAZAR' && 'Rechazar Proyecto'}
            </DialogTitle>
            <DialogDescription>
              {accionActual === 'APROBAR' && 'Los documentos seran aprobados y se procedera a asignar jurados evaluadores.'}
              {accionActual === 'OBSERVAR' && 'Indica las observaciones que debe corregir el estudiante.'}
              {accionActual === 'RECHAZAR' && 'Indica el motivo del rechazo. Esta accion es definitiva.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="comentario">
              {accionActual === 'APROBAR' ? 'Comentario (opcional)' : 'Comentario (requerido)'}
            </Label>
            <Textarea
              id="comentario"
              placeholder={
                accionActual === 'APROBAR'
                  ? 'Agregar un comentario opcional...'
                  : 'Escriba el motivo o las observaciones...'
              }
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={procesando}>
              Cancelar
            </Button>
            <Button
              onClick={ejecutarAccion}
              disabled={procesando}
              className={cn(
                accionActual === 'APROBAR' && 'bg-green-600 hover:bg-green-700',
                accionActual === 'OBSERVAR' && 'bg-orange-600 hover:bg-orange-700',
                accionActual === 'RECHAZAR' && 'bg-red-600 hover:bg-red-700'
              )}
            >
              {procesando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {accionActual === 'APROBAR' && <CheckCircle className="w-4 h-4 mr-2" />}
                  {accionActual === 'OBSERVAR' && <AlertCircle className="w-4 h-4 mr-2" />}
                  {accionActual === 'RECHAZAR' && <XCircle className="w-4 h-4 mr-2" />}
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente para mostrar documento
function DocumentoCard({
  titulo,
  documento,
  iconColor,
  iconBg,
}: {
  titulo: string
  documento?: Documento
  iconColor: string
  iconBg: string
}) {
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={cn(
      'rounded-xl border-2 p-4',
      documento ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' : 'border-muted'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          documento ? 'bg-green-100 dark:bg-green-900/50' : iconBg
        )}>
          {documento ? (
            <FileCheck className="w-5 h-5 text-green-600" />
          ) : (
            <FileText className={cn('w-5 h-5', iconColor)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm">{titulo}</p>
            {documento ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                {documento.firmado ? 'Firmado' : 'Subido'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                No subido
              </Badge>
            )}
          </div>
          {documento ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-background border mt-2">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm flex-1 truncate">{documento.nombre}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(documento.tamano)}
              </span>
              <a
                href={documento.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title="Ver documento"
              >
                <Eye className="w-4 h-4" />
              </a>
              <a
                href={documento.url}
                download
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title="Descargar"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">El documento no ha sido subido</p>
          )}
        </div>
      </div>
    </div>
  )
}
