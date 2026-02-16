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
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TesisEvaluacion {
  id: string
  titulo: string
  resumen: string | null
  palabrasClave: string[]
  estado: string
  lineaInvestigacion: string | null
  rondaActual: number
  faseActual: string | null
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

export default function DetalleEvaluacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const juradoIdParam = searchParams.get('juradoId')
  const { user, isLoading: authLoading } = useAuth()

  const [tesis, setTesis] = useState<TesisEvaluacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

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

  useEffect(() => {
    if (!authLoading && user) {
      loadTesis()
    }
  }, [authLoading, user, id])

  const loadTesis = async () => {
    try {
      setLoading(true)
      const queryParams = juradoIdParam ? `?juradoId=${juradoIdParam}` : ''
      const response = await fetch(`/api/mis-evaluaciones/${id}${queryParams}`)
      const data = await response.json()

      if (data.success) {
        setTesis(data.data)
      } else {
        toast.error(data.error || 'Error al cargar tesis')
        router.push('/mis-evaluaciones')
      }
    } catch {
      toast.error('Error al cargar tesis')
    } finally {
      setLoading(false)
    }
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

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('resultado', resultado)
      formData.append('observaciones', observaciones)
      if (archivoEval) {
        formData.append('archivo', archivoEval)
      }

      const response = await fetch(`/api/mis-evaluaciones/${id}/evaluacion`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        loadTesis()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al enviar evaluacion')
    } finally {
      setEnviando(false)
    }
  }

  const enviarDictamen = async () => {
    if (!archivoDictamen) {
      toast.error('Debe subir el dictamen firmado en PDF')
      return
    }

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

      const response = await fetch(`/api/mis-evaluaciones/${id}/dictamen`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        loadTesis()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al enviar dictamen')
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
              {tesis.fechaLimiteEvaluacion && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Limite (dias habiles): {new Date(tesis.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{tesis.titulo}</h1>
          </div>
        </div>

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
          <div className="lg:col-span-2 space-y-6">
            {/* Documentos para revisar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentos para Revisar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tesis.documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.tipo} - v{doc.version} - {formatFileSize(doc.tamano)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-muted rounded-md transition-colors"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <a
                        href={doc.url}
                        download
                        className="p-2 hover:bg-muted rounded-md transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
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
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar resultado..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APROBADO">Aprobado</SelectItem>
                        <SelectItem value="OBSERVADO">Observado</SelectItem>
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
                      onChange={(e) => setArchivoEval(e.target.files?.[0] || null)}
                      className="mt-1"
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
                    Como presidente, suba el dictamen firmado. El resultado se determina por mayoría de votos del jurado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Resultado por mayoría - solo lectura */}
                  <div className={cn(
                    'p-4 rounded-lg border-2',
                    tesis.progresoEvaluacion.resultadoMayoria === 'APROBADO'
                      ? 'border-green-300 bg-green-50 dark:bg-green-950/30'
                      : 'border-orange-300 bg-orange-50 dark:bg-orange-950/30'
                  )}>
                    <p className="text-sm font-medium mb-1">Resultado por mayoría de votos:</p>
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
                          Ingrese los datos de la sustentación que se programará al aprobar el informe final.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
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
                          <div>
                            <Label>Hora</Label>
                            <Input
                              type="time"
                              value={horaSustentacion}
                              onChange={(e) => setHoraSustentacion(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
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
                      </CardContent>
                    </Card>
                  )}

                  <div>
                    <Label>Dictamen firmado (PDF, requerido)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setArchivoDictamen(e.target.files?.[0] || null)}
                      className="mt-1 cursor-pointer file:cursor-pointer"
                    />
                  </div>

                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    onClick={enviarDictamen}
                    disabled={enviando || !archivoDictamen ||
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

            {/* Mi evaluacion enviada */}
            {tesis.miJurado.yaEvaluo && tesis.miJurado.miEvaluacion && (
              <Card className="border-2 border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Mi Evaluacion Enviada
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
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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

            {/* Evaluaciones de otros jurados */}
            {tesis.miJurado.yaEvaluo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Evaluaciones del Jurado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tesis.jurados.map((jurado) => (
                    <div key={jurado.id} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{jurado.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {TIPO_JURADO_LABELS[jurado.tipo]}
                        </Badge>
                        {jurado.esMio && (
                          <Badge variant="secondary" className="text-xs">Yo</Badge>
                        )}
                        {jurado.yaEvaluo && jurado.evaluacion ? (
                          <Badge className={cn(
                            'text-xs',
                            jurado.evaluacion.resultado === 'APROBADO'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          )}>
                            {jurado.evaluacion.resultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Pendiente</Badge>
                        )}
                      </div>
                      {jurado.evaluacion?.observaciones && (
                        <p className="text-sm text-muted-foreground ml-6 whitespace-pre-wrap">
                          {jurado.evaluacion.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Historial de rondas anteriores */}
            {tesis.rondasAnteriores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Rondas Anteriores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tesis.rondasAnteriores.map((eval_: any) => (
                    <div key={eval_.id} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">Ronda {eval_.ronda}</Badge>
                        <span className="text-sm font-medium">
                          {eval_.juryMember?.user?.nombres} {eval_.juryMember?.user?.apellidoPaterno}
                        </span>
                        <Badge className={cn(
                          'text-xs',
                          eval_.resultado === 'APROBADO'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        )}>
                          {eval_.resultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
                        </Badge>
                      </div>
                      {eval_.observaciones && (
                        <p className="text-sm text-muted-foreground ml-6 whitespace-pre-wrap">
                          {eval_.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
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
                {tesis.autores.map((autor, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
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
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
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

            {/* Detalles */}
            {(tesis.resumen || tesis.lineaInvestigacion) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Detalles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tesis.lineaInvestigacion && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Linea de Investigacion
                      </p>
                      <p className="text-sm">{tesis.lineaInvestigacion}</p>
                    </div>
                  )}
                  {tesis.resumen && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Resumen
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-6">{tesis.resumen}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
