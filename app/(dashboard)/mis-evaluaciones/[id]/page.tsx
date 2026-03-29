'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Gavel,
  GraduationCap,
  History,
  Loader2,
  MapPin,
  Send,
  Upload,
  User,
  Users,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FullscreenLoader } from '@/components/ui/fullscreen-loader'

interface TesisEvaluacion {
  id: string
  titulo: string
  resumen: string | null
  palabrasClave: string[]
  estado: string
  lineaInvestigacion: string | null
  rondaActual: number
  faseActual: string | null
  faseTerminada: boolean
  fechaSustentacion: string | null
  lugarSustentacion: string | null
  modalidadSustentacion: string | null
  fechaLimiteEvaluacion: string | null
  fechaLimiteCorreccion: string | null
  autores: { nombre: string; email: string }[]
  asesores: { nombre: string; tipo: string; email: string }[]
  documentos: { id: string; tipo: string; nombre: string; url: string; tamano: number; version: number }[]
  miJurado: {
    id: string
    tipo: string
    fase: string
    yaEvaluo: boolean
    miEvaluacion: {
      resultado: string
      observaciones: string | null
      archivoUrl: string | null
      fecha: string
    } | null
  }
  jurados: {
    id: string
    tipo: string
    nombre: string
    esMio: boolean
    evaluacion: {
      resultado: string
      observaciones: string | null
      archivoUrl: string | null
      fecha: string
    } | null
    yaEvaluo: boolean
  }[]
  progresoEvaluacion: {
    evaluados: number
    total: number
    todosEvaluaron: boolean
    dictamenSubido: boolean
    resultadoMayoria: string | null
  }
  rondasAnteriores: any[]
}

const TIPO_JURADO_LABELS: Record<string, string> = {
  PRESIDENTE: 'Presidente',
  VOCAL: 'Vocal',
  SECRETARIO: 'Secretario',
  ACCESITARIO: 'Accesitario',
}

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  EN_EVALUACION_JURADO: { label: 'En Evaluación', color: 'text-indigo-700 bg-indigo-100 border-indigo-300' },
  OBSERVADA_JURADO: { label: 'Observada por Jurado', color: 'text-orange-700 bg-orange-100 border-orange-300' },
  PROYECTO_APROBADO: { label: 'Proyecto Aprobado', color: 'text-green-700 bg-green-100 border-green-300' },
  EN_EVALUACION_INFORME: { label: 'Evaluando Informe Final', color: 'text-indigo-700 bg-indigo-100 border-indigo-300' },
  OBSERVADA_INFORME: { label: 'Informe Observado', color: 'text-orange-700 bg-orange-100 border-orange-300' },
  EN_SUSTENTACION: { label: 'En Sustentación', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' },
  SUSTENTADA: { label: 'Sustentada', color: 'text-green-700 bg-green-100 border-green-300' },
  APROBADA: { label: 'Aprobada', color: 'text-green-700 bg-green-100 border-green-300' },
  INFORME_FINAL: { label: 'Informe Final', color: 'text-cyan-700 bg-cyan-100 border-cyan-300' },
}

export default function DetalleEvaluacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const juradoIdParam = searchParams.get('juradoId')
  const { user, isLoading: authLoading } = useAuth()

  const [tesis, setTesis] = useState<TesisEvaluacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  // Modal de espera de jurados
  const [showEsperaModal, setShowEsperaModal] = useState(false)

  // Formulario de evaluacion
  const [resultado, setResultado] = useState<string>('')
  const [observaciones, setObservaciones] = useState('')
  const [archivoEval, setArchivoEval] = useState<File | null>(null)

  // Dictamen (solo presidente)
  const [observacionesDictamen, setObservacionesDictamen] = useState('')
  const [archivoDictamen, setArchivoDictamen] = useState<File | null>(null)

  // Sustentación (presidente, aprobación informe final)
  const [fechaSustentacion, setFechaSustentacion] = useState('')
  const [horaSustentacion, setHoraSustentacion] = useState('')
  const [lugarSustentacion, setLugarSustentacion] = useState('')
  const [modalidadSustentacion, setModalidadSustentacion] = useState('')

  // Conflictos de sustentación
  const [conflictos, setConflictos] = useState<{
    tipo: string
    mensaje: string
    tesis: string
    horaInicio: string
    horaFin: string
  }[]>([])
  const [sustentacionesDia, setSustentacionesDia] = useState<{
    titulo: string
    horaInicio: string
    horaFin: string
    lugar: string | null
    modalidad: string | null
  }[]>([])
  const [verificandoConflictos, setVerificandoConflictos] = useState(false)
  const [horaFinCalculada, setHoraFinCalculada] = useState('')

  // Calcular hora fin cuando cambia hora inicio
  useEffect(() => {
    if (horaSustentacion) {
      const [h, m] = horaSustentacion.split(':').map(Number)
      const finH = h + 2
      setHoraFinCalculada(`${String(finH).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    } else {
      setHoraFinCalculada('')
    }
  }, [horaSustentacion])

  // Verificar conflictos cuando cambian fecha, hora o lugar
  useEffect(() => {
    if (!fechaSustentacion || !horaSustentacion) {
      setConflictos([])
      setSustentacionesDia([])
      return
    }

    const timer = setTimeout(async () => {
      setVerificandoConflictos(true)
      try {
        const data = await api.get<{
          data: {
            conflictos: typeof conflictos
            sustentacionesDia: typeof sustentacionesDia
          }
        }>('/api/sustentaciones/verificar-conflictos', {
          params: {
            fecha: fechaSustentacion,
            hora: horaSustentacion,
            thesisId: id,
            lugar: lugarSustentacion.trim() || undefined,
          },
        })

        setConflictos(data.data.conflictos || [])
        setSustentacionesDia(data.data.sustentacionesDia || [])
      } catch {
        // Silenciar errores de verificación
      } finally {
        setVerificandoConflictos(false)
      }
    }, 500) // debounce 500ms

    return () => clearTimeout(timer)
  }, [fechaSustentacion, horaSustentacion, lugarSustentacion, id])

  useEffect(() => {
    if (!authLoading && user) {
      loadTesis()
    }
  }, [authLoading, user, id])

  const loadTesis = async () => {
    try {
      setLoading(true)
      const data = await api.get<{ data: TesisEvaluacion }>(`/api/mis-evaluaciones/${id}`, {
        params: { juradoId: juradoIdParam || undefined },
      })

      setTesis(data.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar tesis')
      router.push('/mis-evaluaciones')
    } finally {
      setLoading(false)
    }
  }

  const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

  const validarArchivo = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`El archivo "${file.name}" excede el límite de 25MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
      return false
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Solo se permiten archivos PDF')
      return false
    }
    return true
  }

  const enviarEvaluacion = async () => {
    if (!resultado) {
      toast.error('Seleccione un resultado')
      return
    }

    if (resultado === 'OBSERVADO' && !observaciones.trim()) {
      toast.error('Las observaciones son requeridas cuando el resultado es OBSERVADO')
      return
    }

    if (archivoEval && !validarArchivo(archivoEval)) return

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('resultado', resultado)
      formData.append('observaciones', observaciones)
      if (archivoEval) {
        formData.append('archivo', archivoEval)
      }

      const data = await api.post<{ message: string }>(`/api/mis-evaluaciones/${id}/evaluacion`, formData)

      toast.success(data.message)
      await loadTesis()
      // Si es presidente y aún faltan jurados por votar, mostrar modal
      if (esPresidente) {
        setShowEsperaModal(true)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al enviar evaluacion')
    } finally {
      setEnviando(false)
    }
  }

  const enviarDictamen = async () => {
    if (!archivoDictamen) {
      toast.error('Debe subir el dictamen firmado en PDF')
      return
    }

    if (!validarArchivo(archivoDictamen)) return

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('observaciones', observacionesDictamen)
      formData.append('dictamen', archivoDictamen)

      // Agregar datos de sustentación si aplica
      if (fechaSustentacion) formData.append('fechaSustentacion', fechaSustentacion)
      if (horaSustentacion) formData.append('horaSustentacion', horaSustentacion)
      if (lugarSustentacion) formData.append('lugarSustentacion', lugarSustentacion)
      if (modalidadSustentacion) formData.append('modalidadSustentacion', modalidadSustentacion)

      const data = await api.post<{ message: string }>(`/api/mis-evaluaciones/${id}/dictamen`, formData)

      toast.success(data.message)
      loadTesis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al enviar dictamen')
    } finally {
      setEnviando(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!tesis) return null

  const esPresidente = tesis.miJurado.tipo === 'PRESIDENTE'
  const enEvaluacion = ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME'].includes(tesis.estado)
  const puedeEvaluar = enEvaluacion && !tesis.miJurado.yaEvaluo
  const puedeSubirDictamen = esPresidente && tesis.miJurado.yaEvaluo && enEvaluacion && tesis.progresoEvaluacion.todosEvaluaron && !tesis.progresoEvaluacion.dictamenSubido
  const docProyecto = tesis.documentos.find((d) => d.tipo === 'PROYECTO')
  const docInforme = tesis.documentos.find((d) => d.tipo === 'INFORME_FINAL_DOC')

  return (
    <div className="container mx-auto py-6 px-4">
      <FullscreenLoader
        visible={enviando}
        title="Enviando evaluación"
        description="Registrando tu evaluación y notificando al equipo..."
      />
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/mis-evaluaciones" className="hover:text-foreground transition-colors">
            Mis Evaluaciones
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Evaluacion</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Button variant="outline" size="icon" asChild className="flex-shrink-0">
            <Link href="/mis-evaluaciones">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="font-mono">
                {TIPO_JURADO_LABELS[tesis.miJurado.tipo]}
              </Badge>
              <Badge variant="secondary">
                Fase: {tesis.faseActual === 'PROYECTO' ? 'Proyecto' : tesis.faseActual === 'INFORME_FINAL' ? 'Informe Final' : tesis.faseActual || 'Proyecto'}
              </Badge>
              {tesis.rondaActual > 0 && (
                <Badge variant="outline">Ronda {tesis.rondaActual}</Badge>
              )}
              {ESTADO_LABELS[tesis.estado] && (
                <Badge className={cn('text-xs', ESTADO_LABELS[tesis.estado].color)}>
                  {ESTADO_LABELS[tesis.estado].label}
                </Badge>
              )}
              {tesis.fechaLimiteEvaluacion && !['EN_SUSTENTACION', 'SUSTENTADA', 'PROYECTO_APROBADO', 'APROBADA'].includes(tesis.estado) && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Limite (dias habiles): {new Date(tesis.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{tesis.titulo}</h1>
          </div>
        </div>

        {/* Banner de estado post-evaluación */}
        {tesis.estado === 'EN_SUSTENTACION' && (
          <Card className="border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">Informe Final Aprobado - Sustentación Programada</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    El informe final fue aprobado por el jurado evaluador. La sustentación ha sido programada.
                  </p>
                </div>
              </div>
              {tesis.fechaSustentacion && (
                <div className="mt-3 ml-[3.25rem] grid gap-3 sm:grid-cols-3">
                  {(() => {
                    const inicio = new Date(tesis.fechaSustentacion)
                    const fin = new Date(inicio.getTime() + 2 * 60 * 60 * 1000)
                    return (
                      <div className="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide mb-1">Fecha y Hora</p>
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                          {inicio.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          {inicio.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} - {fin.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )
                  })()}
                  {tesis.lugarSustentacion && (
                    <div className="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide mb-1">Lugar</p>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        {tesis.lugarSustentacion}
                      </p>
                    </div>
                  )}
                  {tesis.modalidadSustentacion && (
                    <div className="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide mb-1">Modalidad</p>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        {tesis.modalidadSustentacion === 'PRESENCIAL' ? 'Presencial' :
                         tesis.modalidadSustentacion === 'VIRTUAL' ? 'Virtual' : 'Mixta'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {tesis.estado === 'PROYECTO_APROBADO' && !tesis.faseTerminada && (
          <Card className="border-2 border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">Proyecto Aprobado por el Jurado</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    El dictamen de aprobación fue registrado. Esperando resolución y fase de informe final.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {['OBSERVADA_JURADO', 'OBSERVADA_INFORME'].includes(tesis.estado) && (
          <Card className="border-2 border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-800 dark:text-orange-300">
                    {tesis.estado === 'OBSERVADA_JURADO' ? 'Proyecto Observado' : 'Informe Final Observado'}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    El jurado ha observado el documento. El tesista tiene plazo para realizar correcciones.
                    {tesis.fechaLimiteCorreccion && ` Fecha limite: ${new Date(tesis.fechaLimiteCorreccion).toLocaleDateString('es-PE')}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progreso de evaluaciones */}
        {enEvaluacion && tesis.progresoEvaluacion && (
          <Card className={cn(
            'border-2',
            tesis.progresoEvaluacion.todosEvaluaron
              ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
              : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
          )}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Progreso de evaluaciones</span>
                </div>
                <span className="text-sm font-bold">
                  {tesis.progresoEvaluacion.evaluados}/{tesis.progresoEvaluacion.total} jurados
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={cn(
                    'h-2.5 rounded-full transition-all duration-500',
                    tesis.progresoEvaluacion.todosEvaluaron ? 'bg-green-500' : 'bg-blue-500'
                  )}
                  style={{
                    width: `${tesis.progresoEvaluacion.total > 0
                      ? (tesis.progresoEvaluacion.evaluados / tesis.progresoEvaluacion.total) * 100
                      : 0}%`
                  }}
                />
              </div>
              {tesis.progresoEvaluacion.todosEvaluaron && !tesis.progresoEvaluacion.dictamenSubido && (
                <div className="mt-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {esPresidente
                      ? 'Todos los jurados han evaluado. Ya puede subir el dictamen.'
                      : 'Todos los jurados han evaluado. Esperando dictamen del presidente.'}
                  </span>
                </div>
              )}
              {!tesis.progresoEvaluacion.todosEvaluaron && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Faltan {tesis.progresoEvaluacion.total - tesis.progresoEvaluacion.evaluados} jurado(s) por evaluar.
                  {tesis.fechaLimiteEvaluacion && ` Fecha limite (dias habiles): ${new Date(tesis.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}`}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <Tabs defaultValue={puedeEvaluar ? 'evaluar' : 'documentos'} className="w-full min-w-0">
              <div className="overflow-x-auto -mx-1">
                <TabsList className="w-full grid grid-cols-3 h-10 min-w-[280px]">
                  <TabsTrigger value="documentos" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Docs</span>
                  </TabsTrigger>
                  <TabsTrigger value="evaluar" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Evaluar</span>
                  </TabsTrigger>
                  <TabsTrigger value="historial" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Historial</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab: Documentos */}
              <TabsContent value="documentos" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      Documentos para Revisar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tesis.documentos.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{doc.nombre}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {doc.tipo} - v{doc.version} - {formatFileSize(doc.tamano)}
                          </p>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 sm:p-2 hover:bg-muted rounded-md transition-colors"
                            title="Ver"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </a>
                          <a
                            href={doc.url}
                            download
                            className="p-1.5 sm:p-2 hover:bg-muted rounded-md transition-colors"
                            title="Descargar"
                          >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                    {tesis.documentos.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay documentos disponibles
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Detalles del proyecto en tab docs */}
                {(tesis.resumen || tesis.lineaInvestigacion || tesis.palabrasClave.length > 0) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg">Detalles del Proyecto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {tesis.lineaInvestigacion && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Línea de Investigación</p>
                          <p className="text-sm">{tesis.lineaInvestigacion}</p>
                        </div>
                      )}
                      {tesis.resumen && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Resumen</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tesis.resumen}</p>
                        </div>
                      )}
                      {tesis.palabrasClave.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Palabras Clave</p>
                          <div className="flex flex-wrap gap-2">
                            {tesis.palabrasClave.map((p, i) => (
                              <Badge key={i} variant="secondary">{p}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Evaluar */}
              <TabsContent value="evaluar" className="space-y-6 mt-4 min-w-0" style={{ overflowX: 'hidden' }}>

            {/* Mi evaluacion enviada */}
            {tesis.miJurado.yaEvaluo && tesis.miJurado.miEvaluacion && (
              <Card className="border-2 border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    Mi Evaluación Enviada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Resultado:</span>
                    <Badge className={cn(
                      'text-xs',
                      tesis.miJurado.miEvaluacion.resultado === 'APROBADO'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    )}>
                      {tesis.miJurado.miEvaluacion.resultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
                    </Badge>
                  </div>
                  {tesis.miJurado.miEvaluacion.observaciones && (
                    <div>
                      <p className="text-sm font-medium mb-1">Observaciones:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {tesis.miJurado.miEvaluacion.observaciones}
                      </p>
                    </div>
                  )}
                  {tesis.miJurado.miEvaluacion.archivoUrl && (
                    <a
                      href={tesis.miJurado.miEvaluacion.archivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      Ver archivo adjunto
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enviada el {new Date(tesis.miJurado.miEvaluacion.fecha).toLocaleString('es-PE')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Formulario de evaluacion */}
            {puedeEvaluar && (
              <Card className="border-2 border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    Enviar mi Evaluacion
                  </CardTitle>
                  <CardDescription>
                    Revisa los documentos y envía tu evaluacion individual.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Resultado</Label>
                    <Select value={resultado} onValueChange={setResultado}>
                      <SelectTrigger className="mt-1 cursor-pointer">
                        <SelectValue placeholder="Seleccionar resultado..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APROBADO" className="cursor-pointer">Aprobado</SelectItem>
                        <SelectItem value="OBSERVADO" className="cursor-pointer">Observado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Observaciones {resultado === 'OBSERVADO' ? '(requerido)' : '(opcional)'}</Label>
                    <Textarea
                      placeholder="Escriba sus observaciones..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Archivo adjunto (opcional, PDF)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file && !validarArchivo(file)) {
                          e.target.value = ''
                          setArchivoEval(null)
                          return
                        }
                        setArchivoEval(file)
                      }}
                      className="mt-1 cursor-pointer file:cursor-pointer"
                    />
                  </div>

                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={enviarEvaluacion}
                    disabled={enviando || !resultado}
                  >
                    {enviando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Evaluacion
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Dictamen del Presidente - visible despues de evaluar, cuando puede subir dictamen */}
            {puedeSubirDictamen && (
              <Card className="border-2 border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-amber-600" />
                    Dictamen del Presidente
                  </CardTitle>
                  <CardDescription>
                    Como presidente, suba el dictamen firmado. El resultado se determina por voto unánime del jurado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Resultado por unanimidad - solo lectura */}
                  <div className={cn(
                    'p-4 rounded-lg border-2',
                    tesis.progresoEvaluacion.resultadoMayoria === 'APROBADO'
                      ? 'border-green-300 bg-green-50 dark:bg-green-950/30'
                      : 'border-orange-300 bg-orange-50 dark:bg-orange-950/30'
                  )}>
                    <p className="text-sm font-medium mb-1">Resultado por unanimidad de votos:</p>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        'text-sm px-3 py-1',
                        tesis.progresoEvaluacion.resultadoMayoria === 'APROBADO'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      )}>
                        {tesis.progresoEvaluacion.resultadoMayoria === 'APROBADO' ? 'APROBADO' : 'OBSERVADO'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({tesis.progresoEvaluacion.evaluados} de {tesis.progresoEvaluacion.total} jurados votaron)
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label>Observaciones del dictamen (opcional)</Label>
                    <Textarea
                      placeholder="Observaciones generales del jurado..."
                      value={observacionesDictamen}
                      onChange={(e) => setObservacionesDictamen(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* Programar Sustentación - solo cuando es aprobación de informe final */}
                  {tesis.progresoEvaluacion.resultadoMayoria === 'APROBADO' &&
                    (tesis.faseActual === 'INFORME_FINAL' || tesis.estado === 'EN_EVALUACION_INFORME') && (
                    <Card className="border-2 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          Programar Sustentación
                        </CardTitle>
                        <CardDescription>
                          Ingrese los datos de la sustentación. Cada sustentación tiene una duración de <strong>2 horas</strong>.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label>Fecha de sustentación</Label>
                          <Input
                            type="date"
                            value={fechaSustentacion}
                            onChange={(e) => setFechaSustentacion(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Hora inicio</Label>
                            <Input
                              type="time"
                              value={horaSustentacion}
                              onChange={(e) => setHoraSustentacion(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Hora fin (automático +2h)</Label>
                            <Input
                              type="time"
                              value={horaFinCalculada}
                              readOnly
                              disabled
                              className="mt-1 bg-muted"
                            />
                          </div>
                        </div>
                        {horaSustentacion && horaFinCalculada && (
                          <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 p-2 rounded-md">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span>Horario: <strong>{horaSustentacion} - {horaFinCalculada}</strong> (2 horas)</span>
                          </div>
                        )}
                        <div>
                          <Label>Lugar</Label>
                          <Input
                            placeholder="Ej: Auditorio Principal, Sala de Conferencias..."
                            value={lugarSustentacion}
                            onChange={(e) => setLugarSustentacion(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Modalidad</Label>
                          <Select value={modalidadSustentacion} onValueChange={setModalidadSustentacion}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Seleccionar modalidad..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                              <SelectItem value="VIRTUAL">Virtual</SelectItem>
                              <SelectItem value="MIXTA">Mixta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Verificación de conflictos */}
                        {verificandoConflictos && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verificando disponibilidad...</span>
                          </div>
                        )}

                        {/* Alertas de conflictos */}
                        {conflictos.length > 0 && (
                          <div className="space-y-2">
                            {conflictos.map((conflicto, i) => (
                              <div key={i} className="flex items-start gap-2 p-3 rounded-lg border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                  <p className="font-medium">{conflicto.mensaje}</p>
                                  <p className="text-xs mt-1 opacity-80">Tesis: {conflicto.tesis}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Sustentaciones del día */}
                        {sustentacionesDia.length > 0 && (
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Sustentaciones programadas ese día ({sustentacionesDia.length})
                            </p>
                            <div className="space-y-1.5">
                              {sustentacionesDia.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-background border">
                                  <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <span className="font-mono font-medium">{s.horaInicio}-{s.horaFin}</span>
                                  <Separator orientation="vertical" className="h-3" />
                                  {s.lugar && (
                                    <>
                                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                      <span className="truncate max-w-[100px]">{s.lugar}</span>
                                      <Separator orientation="vertical" className="h-3" />
                                    </>
                                  )}
                                  <span className="truncate flex-1 text-muted-foreground">{s.titulo}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div>
                    <Label>Dictamen firmado (PDF, requerido)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file && !validarArchivo(file)) {
                          e.target.value = ''
                          setArchivoDictamen(null)
                          return
                        }
                        setArchivoDictamen(file)
                      }}
                      className="mt-1 cursor-pointer file:cursor-pointer"
                    />
                  </div>

                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    onClick={enviarDictamen}
                    disabled={enviando || !archivoDictamen ||
                      conflictos.length > 0 ||
                      (tesis.progresoEvaluacion.resultadoMayoria === 'APROBADO' &&
                        (tesis.faseActual === 'INFORME_FINAL' || tesis.estado === 'EN_EVALUACION_INFORME') &&
                        (!fechaSustentacion || !horaSustentacion || !lugarSustentacion || !modalidadSustentacion))
                    }
                  >
                    {enviando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo dictamen...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Dictamen
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Evaluaciones de otros jurados */}
            {tesis.miJurado.yaEvaluo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary shrink-0" />
                    Evaluaciones del Jurado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tesis.jurados.map((jurado) => (
                    <div key={jurado.id} className="p-2 sm:p-3 rounded-lg border">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-xs sm:text-sm">{jurado.nombre}</span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {TIPO_JURADO_LABELS[jurado.tipo]}
                        </Badge>
                        {jurado.esMio && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">Yo</Badge>
                        )}
                        {jurado.yaEvaluo && jurado.evaluacion ? (
                          <Badge className={cn(
                            'text-[10px] sm:text-xs',
                            jurado.evaluacion.resultado === 'APROBADO'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          )}>
                            {jurado.evaluacion.resultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground">Pendiente</Badge>
                        )}
                      </div>
                      {jurado.evaluacion?.observaciones && (
                        <p className="text-xs sm:text-sm text-muted-foreground ml-5 sm:ml-6 whitespace-pre-wrap break-words">
                          {jurado.evaluacion.observaciones}
                        </p>
                      )}
                      {jurado.evaluacion?.fecha && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground ml-5 sm:ml-6 mt-1">
                          Evaluado el {new Date(jurado.evaluacion.fecha).toLocaleString('es-PE')}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
              </TabsContent>

              {/* Tab: Historial */}
              <TabsContent value="historial" className="space-y-6 mt-4">
            {/* Historial de rondas anteriores */}
            {tesis.rondasAnteriores.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <History className="w-5 h-5 text-primary shrink-0" />
                    Rondas Anteriores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tesis.rondasAnteriores.map((eval_: any) => (
                    <div key={eval_.id} className="p-2 sm:p-3 rounded-lg border">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] sm:text-xs">Ronda {eval_.ronda}</Badge>
                        <span className="text-xs sm:text-sm font-medium">
                          {eval_.juryMember?.user?.nombres} {eval_.juryMember?.user?.apellidoPaterno}
                        </span>
                        <Badge className={cn(
                          'text-[10px] sm:text-xs',
                          eval_.resultado === 'APROBADO'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        )}>
                          {eval_.resultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
                        </Badge>
                      </div>
                      {eval_.observaciones && (
                        <p className="text-xs sm:text-sm text-muted-foreground ml-5 sm:ml-6 whitespace-pre-wrap break-words">
                          {eval_.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No hay rondas anteriores</p>
                </CardContent>
              </Card>
            )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Autores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Tesistas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tesis.autores.map((autor, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{autor.nombre}</p>
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
                {tesis.asesores.map((asesor, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{asesor.nombre}</p>
                      <p className="text-xs text-muted-foreground">{asesor.tipo}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de espera de jurados (presidente) */}
      <Dialog open={showEsperaModal} onOpenChange={setShowEsperaModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-3">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <DialogTitle className="text-lg">Evaluación Enviada</DialogTitle>
            <DialogDescription className="mt-2 text-sm">
              {tesis && !tesis.progresoEvaluacion.todosEvaluaron ? (
                <>
                  Tu evaluación ha sido registrada exitosamente. Como <span className="font-semibold">presidente del jurado</span>, podrás subir el dictamen final una vez que <span className="font-semibold">todos los jurados</span> hayan emitido su voto.
                  <span className="block mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs">
                    Faltan <span className="font-bold">{(tesis.progresoEvaluacion.total - tesis.progresoEvaluacion.evaluados)}</span> jurado(s) por evaluar. Te notificaremos cuando todos hayan votado.
                  </span>
                </>
              ) : (
                <>
                  Tu evaluación ha sido registrada. Todos los jurados ya han evaluado. Ahora puedes subir el <span className="font-semibold">dictamen final</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowEsperaModal(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
