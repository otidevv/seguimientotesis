'use client'

import { useState, useEffect, useCallback, use } from 'react'
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
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Eye,
  FileCheck,
  FileText,
  FileUp,
  Gavel,
  GraduationCap,
  History,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  User,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { FullscreenLoader } from '@/components/ui/fullscreen-loader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ESTADO_CONFIG, TIPO_JURADO_LABELS, TIPO_JURADO_COLORS,
  ProjectSidebar, DocumentoCard,
} from '@/components/mesa-partes'
import type { Documento, Proyecto, BusquedaJurado, Jurado } from '@/components/mesa-partes'
import { useResolutionUploadInstance } from '@/hooks/use-resolution-upload'
import { useJuradoManager } from '@/hooks/use-jurado-manager'
import { CalendarStatusWidget } from '@/components/academic-calendar/calendar-status-widget'

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

  // Verificación por documento: { [label]: 'ok' | 'observado' } y observaciones por doc
  const [verificacionDocs, setVerificacionDocs] = useState<Record<string, 'ok' | 'observado'>>({})
  const [observacionesDocs, setObservacionesDocs] = useState<Record<string, string>>({})
  const [verificacionInicializada, setVerificacionInicializada] = useState(false)

  const loadProyecto = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<{ data: Proyecto }>(`/api/mesa-partes/${id}`)
      setProyecto(data.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar proyecto')
      router.push('/mesa-partes')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  // Jurado manager hook
  const jurados = useJuradoManager(id, proyecto?.estado, loadProyecto)

  // Resolution upload hooks
  const resAprobacion = useResolutionUploadInstance(id, id, {
    tipoDocumento: 'RESOLUCION_APROBACION',
    accion: 'SUBIR_RESOLUCION',
    comentario: 'Resolucion de aprobacion subida por Mesa de Partes',
  }, loadProyecto)

  const resSustentacion = useResolutionUploadInstance(id, id, {
    tipoDocumento: 'RESOLUCION_SUSTENTACION',
    accion: 'SUBIR_RESOLUCION_SUSTENTACION',
    comentario: 'Resolución de sustentación subida por Mesa de Partes',
  }, loadProyecto)

  const resJurado = useResolutionUploadInstance(id, id, {
    tipoDocumento: 'RESOLUCION_JURADO',
    successMessage: 'Resolucion de conformacion de jurado subida correctamente',
  }, loadProyecto)

  const resJuradoInforme = useResolutionUploadInstance(id, id, {
    tipoDocumento: 'RESOLUCION_JURADO_INFORME',
    successMessage: 'Resolucion de conformacion de jurado de informe final subida correctamente',
  }, loadProyecto)

  // Pre-poblar verificación con docs que ya estaban OK en observación anterior
  useEffect(() => {
    if (!proyecto || verificacionInicializada || proyecto.estado !== 'EN_REVISION') return
    const obsAnterior = proyecto.historial.find(
      (h: any) => h.estadoNuevo === 'OBSERVADA' && h.comentario
    )
    if (!obsAnterior?.comentario) return

    // Parsear qué docs fueron observados antes
    const docsObservados = new Set<string>()
    obsAnterior.comentario.split('\n').filter((l: string) => l.startsWith('•')).forEach((l: string) => {
      const sinBullet = l.replace(/^•\s*/, '')
      const sep = sinBullet.indexOf(':')
      if (sep !== -1) docsObservados.add(sinBullet.slice(0, sep).trim().toLowerCase())
    })

    if (docsObservados.size === 0) return

    // Auto-marcar como OK los docs que NO fueron observados.
    // Solo autores ACTIVOS tienen sust_i (consistente con allLabels y checksSustentatorios).
    const autoresActivosKeys = proyecto.autores.filter((a: any) => a.estado !== 'DESISTIDO')
    const allKeys = ['proyecto', 'carta_asesor', 'carta_coasesor', 'voucher',
      ...autoresActivosKeys.map((_: any, i: number) => `sust_${i}`)]
    const allLabels: Record<string, string> = {
      proyecto: 'proyecto de tesis',
      carta_asesor: 'carta de aceptación del asesor',
      carta_coasesor: 'carta de aceptación del coasesor',
      voucher: 'voucher de pago',
    }
    // Solo indexar sustentatorios de autores ACTIVOS (no DESISTIDOs)
    proyecto.autores
      .filter((a: any) => a.estado !== 'DESISTIDO')
      .forEach((a: any, i: number) => {
        allLabels[`sust_${i}`] = `sustentatorio — ${a.nombre}`.toLowerCase()
      })

    const preVerificacion: Record<string, 'ok'> = {}
    allKeys.forEach(key => {
      const label = allLabels[key]
      if (label && !docsObservados.has(label)) {
        preVerificacion[key] = 'ok'
      }
    })

    if (Object.keys(preVerificacion).length > 0) {
      setVerificacionDocs(preVerificacion)
    }
    setVerificacionInicializada(true)
  }, [proyecto, verificacionInicializada])

  useEffect(() => {
    if (!authLoading && user) {
      loadProyecto()
    }
  }, [authLoading, user, loadProyecto])

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
      const data = await api.put<{ message: string }>(`/api/mesa-partes/${id}`, {
        accion: accionActual,
        comentario: comentario.trim(),
      })

      toast.success(data.message)
      setDialogOpen(false)
      loadProyecto()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar accion')
    } finally {
      setProcesando(false)
    }
  }


  // Confirmar voucher sustentacion fisico
  const confirmarVoucherSustentacion = async () => {
    setProcesando(true)
    try {
      const data = await api.put<{ message: string }>(`/api/mesa-partes/${id}`, { accion: 'CONFIRMAR_VOUCHER_SUSTENTACION' })
      toast.success(data.message)
      loadProyecto()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al confirmar vouchers de sustentación')
    } finally {
      setProcesando(false)
    }
  }

  // Confirmar ejemplares
  const confirmarEjemplares = async () => {
    setProcesando(true)
    try {
      const data = await api.put<{ message: string }>(`/api/mesa-partes/${id}`, { accion: 'CONFIRMAR_EJEMPLARES' })
      toast.success(data.message)
      loadProyecto()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al confirmar ejemplares')
    } finally {
      setProcesando(false)
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
  const puedeGestionar = proyecto.estado === 'EN_REVISION'
  const puedeGestionarInforme = proyecto.estado === 'EN_REVISION_INFORME'
  const esAsignandoJurados = proyecto.estado === 'ASIGNANDO_JURADOS'
  const esProyectoAprobado = proyecto.estado === 'PROYECTO_APROBADO'
  const esInformeFinal = proyecto.estado === 'INFORME_FINAL'
  const docProyecto = proyecto.documentos.find((d) => d.tipo === 'PROYECTO')
  const docCartaAsesor = proyecto.documentos.find((d) => d.tipo === 'CARTA_ACEPTACION_ASESOR')
  const docCartaCoasesor = proyecto.documentos.find((d) => d.tipo === 'CARTA_ACEPTACION_COASESOR')
  const docVoucher = proyecto.documentos.find((d) => d.tipo === 'VOUCHER_PAGO')
  const docsSustentatorios = proyecto.documentos.filter((d) => d.tipo === 'DOCUMENTO_SUSTENTATORIO')

  // Documentos de Informe Final
  const docInformeFinal = proyecto.documentos.find((d) => d.tipo === 'INFORME_FINAL_DOC')
  const docVoucherInforme = proyecto.documentos.find((d) => d.tipo === 'VOUCHER_PAGO_INFORME')
  const docReporteTurnitin = proyecto.documentos.find((d) => d.tipo === 'REPORTE_TURNITIN')
  const docActaVerificacion = proyecto.documentos.find((d) => d.tipo === 'ACTA_VERIFICACION_ASESOR')
  const docResolucionJurado = proyecto.documentos.find((d) => d.tipo === 'RESOLUCION_JURADO')
  const docResolucionAprobacion = proyecto.documentos.find((d) => d.tipo === 'RESOLUCION_APROBACION')
  const docVoucherSalaGrados = proyecto.documentos.find((d) => d.tipo === 'VOUCHER_SALA_GRADOS')
  const docVoucherSustentacion = proyecto.documentos.find((d) => d.tipo === 'VOUCHER_SUSTENTACION')
  const docConstanciaSunedu = proyecto.documentos.find((d) => d.tipo === 'CONSTANCIA_SUNEDU')
  const docResolucionSustentacion = proyecto.documentos.find((d) => d.tipo === 'RESOLUCION_SUSTENTACION')
  const docResolucionJuradoInforme = proyecto.documentos.find((d) => d.tipo === 'RESOLUCION_JURADO_INFORME')
  const docDictamenProyecto = proyecto.documentos.find((d) => d.tipo === 'DICTAMEN_JURADO' && d.nombre?.toLowerCase().includes('proyecto'))
  const docDictamenInforme = proyecto.documentos.find((d) => d.tipo === 'DICTAMEN_JURADO' && d.nombre?.toLowerCase().includes('informe'))
  const docDictamen = proyecto.documentos.find((d) => d.tipo === 'DICTAMEN_JURADO')

  // Estados que muestran documentos de informe final
  const mostrarDocsInforme = ['INFORME_FINAL', 'EN_REVISION_INFORME', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME', 'APROBADA', 'EN_SUSTENTACION'].includes(proyecto.estado)
  const esAprobada = proyecto.estado === 'APROBADA'
  const esEnSustentacion = proyecto.estado === 'EN_SUSTENTACION'

  // Verificar jurados completos (fase PROYECTO)
  const ordenJurado: Record<string, number> = { PRESIDENTE: 1, VOCAL: 2, SECRETARIO: 3, ACCESITARIO: 4 }
  const juradosProyecto = (proyecto.jurados || []).filter((j: any) => j.fase === 'PROYECTO').sort((a: any, b: any) => (ordenJurado[a.tipo] || 5) - (ordenJurado[b.tipo] || 5))
  const tiposJuradoAsignados = juradosProyecto.map((j: any) => j.tipo)
  const tienePresidente = tiposJuradoAsignados.includes('PRESIDENTE')
  const tieneVocal = tiposJuradoAsignados.includes('VOCAL')
  const tieneSecretario = tiposJuradoAsignados.includes('SECRETARIO')
  const tieneAccesitario = tiposJuradoAsignados.includes('ACCESITARIO')
  const juradosCompletos = tienePresidente && tieneVocal && tieneSecretario && tieneAccesitario

  // Jurados para fase INFORME_FINAL
  const juradosInforme = (proyecto.jurados || []).filter((j: any) => j.fase === 'INFORME_FINAL').sort((a: any, b: any) => (ordenJurado[a.tipo] || 5) - (ordenJurado[b.tipo] || 5))
  const tiposJuradoInforme = juradosInforme.map((j: any) => j.tipo)
  const tienePresidenteInforme = tiposJuradoInforme.includes('PRESIDENTE')
  const tieneVocalInforme = tiposJuradoInforme.includes('VOCAL')
  const tieneSecretarioInforme = tiposJuradoInforme.includes('SECRETARIO')
  const tieneAccesitarioInforme = tiposJuradoInforme.includes('ACCESITARIO')
  const juradosInformeCompletos = tienePresidenteInforme && tieneVocalInforme && tieneSecretarioInforme && tieneAccesitarioInforme

  // Detectar desistimientos usando datos estructurados de ThesisWithdrawal
  const desistimientosEstructurados = proyecto.desistimientos ?? []
  const desistimientoPendiente = desistimientosEstructurados.find((d) => d.estadoSolicitud === 'PENDIENTE')
  const desistimientosAprobados = desistimientosEstructurados.filter((d) => d.estadoSolicitud === 'APROBADO')
  const ultimoAprobado = desistimientosAprobados[0]
  const huboDesistimiento = desistimientosAprobados.length > 0

  // Una resolución requiere modificatoria solo si fue EMITIDA ANTES del desistimiento
  // aprobado (con datos de autores que ya no corresponden). Si la resolución se
  // emitió DESPUÉS del desistimiento, ya lleva los autores actuales y no requiere
  // actualización.
  const fechaUltimoDesistimiento = ultimoAprobado?.aprobadoAt
    ? new Date(ultimoAprobado.aprobadoAt)
    : null
  const fueEmitidaAntesDelDesistimiento = (doc: { fechaSubida?: string } | undefined | null) =>
    !!doc && !!fechaUltimoDesistimiento && new Date(doc.fechaSubida ?? 0) < fechaUltimoDesistimiento

  const resolJuradoRequiereModif = fueEmitidaAntesDelDesistimiento(docResolucionJurado)
  const resolAprobRequiereModif = fueEmitidaAntesDelDesistimiento(docResolucionAprobacion)
  const resolucionRequiereActualizacion = huboDesistimiento
    && (resolJuradoRequiereModif || resolAprobRequiereModif)
    && !ultimoAprobado?.resolucionDocumentoId

  const loaderMessages: Record<string, { title: string; description: string }> = {
    APROBAR: { title: 'Aprobando proyecto', description: 'Registrando la aprobación y notificando al tesista...' },
    OBSERVAR: { title: 'Registrando observaciones', description: 'Guardando las observaciones y notificando al tesista...' },
    RECHAZAR: { title: 'Rechazando proyecto', description: 'Registrando el rechazo y notificando al tesista...' },
  }
  const loaderInfo = accionActual ? loaderMessages[accionActual] : null

  return (
    <div className="container mx-auto py-6 px-4">
      <FullscreenLoader
        visible={procesando}
        title={loaderInfo?.title ?? 'Procesando'}
        description={loaderInfo?.description ?? 'Por favor espera un momento...'}
      />

      <div className="max-w-5xl mx-auto space-y-6" style={{ overflowX: 'hidden' }}>
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

        {/* Estado del calendario academico para esta tesis especifica */}
        <CalendarStatusWidget
          thesisId={id}
          tipos={[
            'REVISION_MESA_PARTES',
            'ASIGNACION_JURADOS',
            'EVALUACION_JURADO',
            'SUSTENTACION',
            'INFORME_FINAL',
            'DESISTIMIENTO',
          ]}
          titulo="Ventanas aplicables a esta tesis"
        />

        {/* Banner: solicitud de desistimiento pendiente de revisión */}
        {desistimientoPendiente && (
          <Card className="border-2 border-amber-400 bg-amber-50/80 dark:bg-amber-950/30">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Solicitud de desistimiento pendiente</p>
                <p className="text-sm mt-1">
                  {desistimientoPendiente.user.nombres} {desistimientoPendiente.user.apellidoPaterno} solicitó desistir.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href={`/mesa-partes/desistimientos/${desistimientoPendiente.id}`}>Revisar solicitud</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerta de desistimiento - resolución requiere actualización */}
        {resolucionRequiereActualizacion && (
          <Card className="border-2 border-amber-400 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/30">
            <CardContent className="py-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Desistimiento registrado — Resoluciones requieren actualización</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {ultimoAprobado && `${ultimoAprobado.user.apellidoPaterno}, ${ultimoAprobado.user.nombres} desistió. Motivo: ${ultimoAprobado.motivoDescripcion}`}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {(ultimoAprobado?.aprobadoAt ?? ultimoAprobado?.solicitadoAt) && `Registrado el ${new Date(ultimoAprobado.aprobadoAt ?? ultimoAprobado.solicitadoAt).toLocaleString('es-PE')}`}
                    {ultimoAprobado?.aprobadoPor && ` — Por: ${ultimoAprobado.aprobadoPor.nombres} ${ultimoAprobado.aprobadoPor.apellidoPaterno}`}
                  </p>
                </div>
              </div>

              {/* Checklist de pendientes post-desistimiento.
                  Solo listamos resoluciones que REALMENTE fueron emitidas
                  antes del desistimiento — si nunca se subió la resolución,
                  no hay nada que modificar en ese ítem. */}
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-background p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Pendientes por resolver:</p>
                <ul className="space-y-2 text-sm">
                  {resolJuradoRequiereModif && (
                    <li className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-amber-800 dark:text-amber-200">
                        Subir resolución modificatoria de conformación de jurado
                      </span>
                    </li>
                  )}
                  {resolAprobRequiereModif && (
                    <li className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-amber-800 dark:text-amber-200">Subir resolución modificatoria de aprobación de proyecto</span>
                    </li>
                  )}
                  {(() => {
                    const autoresActivos = proyecto.autores.filter((a) => a.estado !== 'DESISTIDO')
                    const todosTienenDoc = autoresActivos.every((a) => docsSustentatorios.some((d) => d.subidoPor && a.nombre.startsWith(d.subidoPor)))
                    return (
                      <li className="flex items-center gap-2">
                        {todosTienenDoc
                          ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        }
                        <span className="text-amber-800 dark:text-amber-200">
                          Verificar documentos sustentatorios de los autores actuales ({autoresActivos.length} autor{autoresActivos.length === 1 ? '' : 'es'})
                        </span>
                      </li>
                    )
                  })()}
                </ul>

                {/* Autores actuales (excluye desistidos históricos) */}
                <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Autores actuales de la tesis:</p>
                  <div className="space-y-1.5">
                    {proyecto.autores.filter((autor) => autor.estado !== 'DESISTIDO').map((autor) => {
                      const tieneDocSust = docsSustentatorios.some((d) => d.subidoPor && autor.nombre.startsWith(d.subidoPor))
                      return (
                        <div key={autor.id} className="flex items-center gap-2 text-sm">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                            tieneDocSust ? 'bg-green-100 dark:bg-green-900/50' : 'bg-amber-100 dark:bg-amber-900/50'
                          )}>
                            {tieneDocSust
                              ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                              : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            }
                          </div>
                          <span className="font-medium">{autor.nombre}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {autor.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'Principal' : 'Coautor'}
                          </Badge>
                          {!tieneDocSust && (
                            <span className="text-xs text-amber-600">— Falta doc. sustentatorio</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensaje cuando el proyecto está observado - esperando correcciones */}
        {proyecto.estado === 'OBSERVADA' && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                <div>
                  <p className="font-semibold text-orange-700">Esperando correcciones del tesista</p>
                  <p className="text-sm text-orange-600">
                    El proyecto fue observado. Los botones de accion se habilitaran cuando el tesista reenvie el proyecto a revision.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Acciones de revision de informe final */}
        {puedeGestionarInforme && (
          <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Revisión de Informe Final</p>
                  <p className="text-sm text-muted-foreground">
                    Revisa los documentos del informe final y toma una decisión
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50 w-full sm:w-auto"
                    onClick={() => abrirDialogo('OBSERVAR')}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Observar
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                    onClick={() => abrirDialogo('APROBAR')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobar Informe
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna principal con Tabs */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <Tabs defaultValue="gestion" className="w-full min-w-0">
              <div className="overflow-x-auto -mx-1">
                <TabsList className="w-full grid grid-cols-3 h-10 min-w-[280px]">
                  <TabsTrigger value="gestion" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Gestión</span>
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Docs</span>
                  </TabsTrigger>
                  <TabsTrigger value="historial" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                    <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Historial</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab: Gestión */}
              <TabsContent value="gestion" className="space-y-6 mt-4 min-w-0" style={{ overflowX: 'hidden' }}>

            {/* Checklist de verificación documental - solo EN_REVISION (esperando revisión) */}
            {puedeGestionar && (() => {
              const asesorNombre = proyecto.asesores.find((a: any) => a.tipo === 'ASESOR')?.nombre
              const coasesorNombre = proyecto.asesores.find((a: any) => a.tipo === 'COASESOR')?.nombre
              // Una carta con `requiereActualizacion: true` existe pero quedó obsoleta
              // tras un cambio de composición de autores — NO cuenta como presentada.
              const cartaAsesorVigente = !!docCartaAsesor && !docCartaAsesor.requiereActualizacion
              const cartaCoasesorVigente = !!docCartaCoasesor && !docCartaCoasesor.requiereActualizacion
              const checksBase = [
                { key: 'proyecto', label: 'Proyecto de Tesis', presentado: !!docProyecto, doc: docProyecto, subidoPor: docProyecto?.subidoPor },
                { key: 'carta_asesor', label: 'Carta de Aceptación del Asesor', presentado: cartaAsesorVigente, doc: docCartaAsesor, subidoPor: asesorNombre || docCartaAsesor?.subidoPor },
                { key: 'carta_coasesor', label: 'Carta de Aceptación del Coasesor', presentado: cartaCoasesorVigente, doc: docCartaCoasesor, subidoPor: coasesorNombre || docCartaCoasesor?.subidoPor, opcional: !proyecto.asesores.some((a: any) => a.tipo === 'COASESOR') },
                { key: 'voucher', label: 'Voucher de Pago (S/. 30.00 - Cód. 277)', presentado: !!docVoucher, doc: docVoucher, subidoPor: docVoucher?.subidoPor },
              ].filter(c => !c.opcional)

              // Solo pedir sustentatorio de autores ACTIVOS (excluye DESISTIDOs históricos).
              const checksSustentatorios = proyecto.autores
                .filter((autor: any) => autor.estado !== 'DESISTIDO')
                .map((autor: any, idx: number) => {
                  const docSust = docsSustentatorios.find((d: any) =>
                    d.subidoPor && autor.nombre && (
                      autor.nombre.startsWith(d.subidoPor) || d.subidoPor.startsWith(autor.nombre.split(' ').slice(0, 2).join(' '))
                    )
                  )
                  return {
                    key: `sust_${idx}`,
                    label: `Sustentatorio — ${autor.nombre}`,
                    presentado: !!docSust,
                    doc: docSust,
                    subidoPor: autor.nombre,
                  }
                })

              const checks = [...checksBase, ...checksSustentatorios]
              const docsConArchivo = checks.filter(c => c.presentado)
              const verificados = docsConArchivo.filter(c => verificacionDocs[c.key] === 'ok').length
              const observados = docsConArchivo.filter(c => verificacionDocs[c.key] === 'observado').length
              const sinRevisar = docsConArchivo.length - verificados - observados
              const todosRevisados = sinRevisar === 0 && docsConArchivo.length > 0
              const hayObservaciones = observados > 0

              return (
                <Card className="border-2 border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-blue-600 shrink-0" />
                      Verificación Documental
                    </CardTitle>
                    <CardDescription>
                      Revise cada documento y marque como verificado u observado. El tesista recibirá el detalle de cada observación.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {checks.map((check) => {
                      const estado = verificacionDocs[check.key]
                      return (
                        <div key={check.key} className={cn(
                          'rounded-lg border p-3 transition-all',
                          !check.presentado && 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800',
                          check.presentado && !estado && 'bg-background',
                          estado === 'ok' && 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800',
                          estado === 'observado' && 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800',
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                              !check.presentado && 'bg-red-100 dark:bg-red-900/50',
                              check.presentado && !estado && 'bg-gray-100 dark:bg-gray-800',
                              estado === 'ok' && 'bg-green-100 dark:bg-green-900/50',
                              estado === 'observado' && 'bg-orange-100 dark:bg-orange-900/50',
                            )}>
                              {!check.presentado && <XCircle className="w-4 h-4 text-red-500" />}
                              {check.presentado && !estado && <Clock className="w-4 h-4 text-gray-400" />}
                              {estado === 'ok' && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {estado === 'observado' && <AlertCircle className="w-4 h-4 text-orange-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block">{check.label}</span>
                              {check.subidoPor && (
                                <span className="text-[11px] text-muted-foreground">Subido por: {check.subidoPor}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {check.doc && (
                                <a
                                  href={check.doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded-md hover:bg-primary/5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver
                                </a>
                              )}
                              {check.presentado && (
                                <>
                                  <Button
                                    variant={estado === 'ok' ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn('h-7 text-[11px] px-2', estado === 'ok' && 'bg-green-600 hover:bg-green-700')}
                                    onClick={() => {
                                      setVerificacionDocs(prev => ({ ...prev, [check.key]: 'ok' }))
                                      setObservacionesDocs(prev => { const n = { ...prev }; delete n[check.key]; return n })
                                    }}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    OK
                                  </Button>
                                  <Button
                                    variant={estado === 'observado' ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn('h-7 text-[11px] px-2', estado === 'observado' && 'bg-orange-600 hover:bg-orange-700')}
                                    onClick={() => setVerificacionDocs(prev => ({ ...prev, [check.key]: 'observado' }))}
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Observar
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {!check.presentado && (
                            <p className="text-xs text-red-600 mt-2 ml-10">No presentado por el tesista</p>
                          )}
                          {estado === 'observado' && (
                            <div className="mt-2 ml-10">
                              <Textarea
                                placeholder="Detalle la observación para este documento..."
                                value={observacionesDocs[check.key] || ''}
                                onChange={(e) => setObservacionesDocs(prev => ({ ...prev, [check.key]: e.target.value }))}
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Resumen y acción rápida */}
                    <div className="pt-3 border-t mt-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {verificados > 0 && (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> {verificados} verificado{verificados > 1 ? 's' : ''}
                          </span>
                        )}
                        {observados > 0 && (
                          <span className="flex items-center gap-1 text-orange-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> {observados} observado{observados > 1 ? 's' : ''}
                          </span>
                        )}
                        {sinRevisar > 0 && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" /> {sinRevisar} sin revisar
                          </span>
                        )}
                      </div>

                      {todosRevisados && !hayObservaciones && (
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => abrirDialogo('APROBAR')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Todos verificados — Aprobar proyecto
                        </Button>
                      )}
                      {todosRevisados && hayObservaciones && (
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700"
                          onClick={() => {
                            // Construir comentario con las observaciones por documento
                            const obs = Object.entries(observacionesDocs)
                              .filter(([, v]) => v.trim())
                              .map(([key, v]) => {
                                const check = checks.find(c => c.key === key)
                                return `• ${check?.label}: ${v.trim()}`
                              })
                              .join('\n')
                            const sinDetalle = Object.entries(verificacionDocs)
                              .filter(([, v]) => v === 'observado')
                              .filter(([key]) => !observacionesDocs[key]?.trim())
                              .map(([key]) => {
                                const check = checks.find(c => c.key === key)
                                return `• ${check?.label}: Observado (sin detalle)`
                              })
                              .join('\n')
                            const comentarioFinal = [obs, sinDetalle].filter(Boolean).join('\n')
                            setComentario(comentarioFinal)
                            setAccionActual('OBSERVAR')
                            setDialogOpen(true)
                          }}
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Enviar observaciones al tesista ({observados} documento{observados > 1 ? 's' : ''})
                        </Button>
                      )}
                      {todosRevisados && (
                        <Button
                          variant="outline"
                          className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => abrirDialogo('RECHAZAR')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rechazar proyecto
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Documentos presentados - vista lectura cuando está OBSERVADA o estados sin gestión activa */}
            {proyecto.estado === 'OBSERVADA' && (() => {
              const docs = [
                { label: 'Proyecto de Tesis', doc: docProyecto },
                { label: 'Carta de Aceptación del Asesor', doc: docCartaAsesor },
                ...(proyecto.asesores.some((a: any) => a.tipo === 'COASESOR')
                  ? [{ label: 'Carta de Aceptación del Coasesor', doc: docCartaCoasesor }]
                  : []),
                { label: 'Voucher de Pago', doc: docVoucher },
                // Solo autores ACTIVOS (DESISTIDOs son históricos, no se revisan).
                ...proyecto.autores
                  .filter((autor: any) => autor.estado !== 'DESISTIDO')
                  .map((autor: any) => {
                    const docSust = docsSustentatorios.find((d: any) =>
                      d.subidoPor && autor.nombre && (
                        autor.nombre.startsWith(d.subidoPor) || d.subidoPor.startsWith(autor.nombre.split(' ').slice(0, 2).join(' '))
                      )
                    )
                    return { label: `Sustentatorio — ${autor.nombre}`, doc: docSust }
                  }),
              ]
              // Obtener la última observación del historial
              const ultimaObs = proyecto.historial.find(
                (h: any) => h.estadoNuevo === 'OBSERVADA' && h.comentario
              )
              // Detectar qué documentos fueron observados según el comentario
              // Busca el label completo (incluyendo el nombre del autor) para no confundir sustentatorios
              const obsText = ultimaObs?.comentario || ''
              const fueObservado = (label: string) => {
                // Buscar "• Label:" en el texto de observaciones (formato exacto generado por el checklist)
                return obsText.includes(`• ${label}:`) || obsText.includes(`• ${label}: `)
              }
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      Documentos Presentados
                    </CardTitle>
                    <CardDescription>
                      El tesista está corrigiendo las observaciones. Estos son los documentos que presentó.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ultimaObs?.comentario && (
                      <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 p-3 mb-4">
                        <p className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Observaciones enviadas:</p>
                        <p className="text-sm text-orange-700 dark:text-orange-300 whitespace-pre-wrap">{ultimaObs.comentario}</p>
                        {ultimaObs.realizadoPor && (
                          <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-2">
                            Por: {ultimaObs.realizadoPor} — {new Date(ultimaObs.fecha).toLocaleString('es-PE')}
                          </p>
                        )}
                      </div>
                    )}
                    {docs.map((item) => {
                      const esObservado = fueObservado(item.label)
                      return (
                        <div key={item.label} className={cn(
                          'flex items-center gap-3 p-2.5 rounded-lg border',
                          esObservado
                            ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700'
                            : 'bg-background'
                        )}>
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                            esObservado
                              ? 'bg-orange-100 dark:bg-orange-900/50'
                              : item.doc ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
                          )}>
                            {esObservado
                              ? <AlertCircle className="w-4 h-4 text-orange-600" />
                              : item.doc
                                ? <CheckCircle className="w-4 h-4 text-green-600" />
                                : <XCircle className="w-4 h-4 text-red-500" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={cn('text-sm', esObservado ? 'font-medium text-orange-800 dark:text-orange-200' : '')}>{item.label}</span>
                            {esObservado && (
                              <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">Observado — pendiente de corrección</p>
                            )}
                          </div>
                          {item.doc && (
                            <a
                              href={item.doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded-md hover:bg-primary/5 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })()}

            {/* Panel de Resolucion de Conformacion de Jurado - si no se subió O si requiere actualización por desistimiento */}
            {(!docResolucionJurado || resolucionRequiereActualizacion) && (esAsignandoJurados || ['EN_EVALUACION_JURADO', 'OBSERVADA_JURADO', 'PROYECTO_APROBADO'].includes(proyecto.estado)) && (
              <Card className={cn(
                'border-2',
                resolucionRequiereActualizacion
                  ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
              )}>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                    {resolucionRequiereActualizacion
                      ? <RefreshCw className="w-5 h-5 text-red-600 shrink-0" />
                      : <FileUp className="w-5 h-5 text-amber-600 shrink-0" />
                    }
                    {resolucionRequiereActualizacion
                      ? 'Resolución Modificatoria de Jurado'
                      : 'Resolución de Conformación de Jurado'
                    }
                  </CardTitle>
                  <CardDescription>
                    {resolucionRequiereActualizacion
                      ? 'Hubo un desistimiento. Suba la resolución modificatoria con los datos actualizados de los autores.'
                      : 'Suba la resolución de conformación de jurado de revisión de proyecto de tesis.'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {esAsignandoJurados ? (
                    <>
                      <div>
                        <Label htmlFor="resolucion-jurado">Archivo de Resolucion (PDF)</Label>
                        <Input
                          id="resolucion-jurado"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            resJurado.setArchivo(file)
                            if (file && !resJurado.nombre.trim()) {
                              resJurado.setNombre(file.name.replace(/\.pdf$/i, ''))
                            }
                          }}
                          className="mt-1 cursor-pointer file:cursor-pointer"
                        />
                      </div>
                      {resJurado.archivo && (
                        <div>
                          <Label htmlFor="nombre-resolucion-jurado">Nombre / Numero de Resolucion</Label>
                          <Input
                            id="nombre-resolucion-jurado"
                            type="text"
                            placeholder="Ej: Resolucion 085-2026-UNAMAD"
                            value={resJurado.nombre}
                            onChange={(e) => resJurado.setNombre(e.target.value)}
                            className="mt-1"
                          />
                          <span className="text-xs text-amber-700 dark:text-amber-400 mt-1 block">
                            Ingrese el nombre de la resolucion tal cual aparece en el documento, este dato se usara para la generacion de reportes.
                          </span>
                        </div>
                      )}
                      <Button
                        className="w-full bg-amber-600 hover:bg-amber-700"
                        onClick={resJurado.submit}
                        disabled={resJurado.subiendo || !resJurado.archivo || !resJurado.nombre.trim()}
                      >
                        {resJurado.subiendo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <FileUp className="w-4 h-4 mr-2" />
                            Subir Resolucion
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No se ha subido la resolucion de conformacion de jurado.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Panel de Asignacion de Jurados */}
            {esAsignandoJurados && (
              <Card className="border-2 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-purple-600 shrink-0" />
                    Asignar Jurados Evaluadores
                  </CardTitle>
                  <CardDescription>
                    Asigne al menos un Presidente, Vocal y Secretario para iniciar la evaluacion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Jurados asignados (fase PROYECTO) */}
                  {juradosProyecto.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Jurados asignados:</p>
                      {juradosProyecto.map((jurado: any) => (
                        <div key={jurado.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-white dark:bg-background">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{jurado.nombre}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{jurado.email}</p>
                          </div>
                          <Badge className={cn('text-[10px] sm:text-xs shrink-0', TIPO_JURADO_COLORS[jurado.tipo])}>
                            {TIPO_JURADO_LABELS[jurado.tipo]}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                            onClick={() => jurados.remover(jurado.id)}
                            disabled={jurados.procesando}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                    <Badge variant="outline" className={cn('text-xs', tieneAccesitario ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')}>
                      {tieneAccesitario ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      Accesitario
                    </Badge>
                  </div>

                  <Separator />

                  {/* Buscador */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Buscar y agregar jurado:</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Select value={jurados.tipoJurado} onValueChange={jurados.setTipoJurado}>
                        <SelectTrigger className="w-full sm:w-[160px]">
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
                          value={jurados.busqueda}
                          onChange={(e) => jurados.setBusqueda(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Resultados de busqueda */}
                    {(jurados.buscando || jurados.resultados.length > 0) && jurados.busqueda.length >= 2 && (
                      <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {jurados.buscando ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Buscando...</span>
                          </div>
                        ) : jurados.resultados.length === 0 ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            No se encontraron resultados
                          </div>
                        ) : (
                          jurados.resultados.map((resultado) => (
                            <div
                              key={resultado.id}
                              className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                              onClick={() => jurados.asignar(resultado.id)}
                            >
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{resultado.nombreCompleto}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  DNI: {resultado.numeroDocumento} - {resultado.email}
                                </p>
                                {resultado.esDocente && (
                                  <p className="text-xs text-muted-foreground">
                                    Docente - {resultado.departamento || 'Sin departamento'}
                                  </p>
                                )}
                              </div>
                              <Button variant="outline" size="sm" disabled={jurados.procesando} className="shrink-0">
                                <UserPlus className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Asignar</span>
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
                    onClick={jurados.confirmar}
                    disabled={jurados.procesando || !juradosCompletos || !docResolucionJurado}
                  >
                    {jurados.procesando ? (
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
                      Debe asignar Presidente, Vocal, Secretario y Accesitario
                    </p>
                  )}
                  {juradosCompletos && !docResolucionJurado && (
                    <p className="text-xs text-amber-600 text-center">
                      Debe subir la resolucion de conformacion de jurado antes de confirmar
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Panel de Subir Resolucion (PROYECTO_APROBADO o actualización por desistimiento en fases posteriores) */}
            {(esProyectoAprobado || (resolucionRequiereActualizacion && mostrarDocsInforme)) && (
              <Card className={cn(
                'border-2',
                resolucionRequiereActualizacion && !esProyectoAprobado
                  ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
              )}>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                    {resolucionRequiereActualizacion && !esProyectoAprobado
                      ? <RefreshCw className="w-5 h-5 text-red-600 shrink-0" />
                      : <FileUp className="w-5 h-5 text-emerald-600 shrink-0" />
                    }
                    {resolucionRequiereActualizacion && !esProyectoAprobado
                      ? 'Resolución Modificatoria de Aprobación'
                      : 'Subir Resolución de Aprobación'
                    }
                  </CardTitle>
                  <CardDescription>
                    {resolucionRequiereActualizacion && !esProyectoAprobado
                      ? 'Hubo un desistimiento. Suba la resolución modificatoria de aprobación con los datos actualizados de los autores.'
                      : 'El proyecto fue aprobado por los jurados. Suba la resolución de aprobación para que el estudiante pueda iniciar el informe final.'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="nombre-resolucion-aprobacion">Título de la Resolución</Label>
                    <Input
                      id="nombre-resolucion-aprobacion"
                      type="text"
                      placeholder="Ej: Resolución N° 001-2026-UNAMAD-FI"
                      className="mt-2"
                      value={resAprobacion.nombre}
                      onChange={(e) => resAprobacion.setNombre(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="resolucion">Archivo de Resolucion (PDF)</Label>
                    <Input
                      id="resolucion"
                      type="file"
                      accept=".pdf"
                      className="mt-2 cursor-pointer file:cursor-pointer"
                      onChange={(e) => resAprobacion.setArchivo(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={resAprobacion.submit}
                    disabled={resAprobacion.subiendo || !resAprobacion.archivo || !resAprobacion.nombre.trim()}
                  >
                    {resAprobacion.subiendo ? (
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

            {/* Panel para subir resolución si falta en INFORME_FINAL */}
            {esInformeFinal && !proyecto.documentos.find((d: any) => d.tipo === 'RESOLUCION_APROBACION') && (
              <Card className="border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                    <FileUp className="w-5 h-5 text-emerald-600 shrink-0" />
                    Subir Resolución de Aprobación
                  </CardTitle>
                  <CardDescription>
                    La resolución de aprobación no fue guardada correctamente. Suba el archivo nuevamente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="nombre-resolucion-aprobacion-informe">Título de la Resolución</Label>
                    <Input
                      id="nombre-resolucion-aprobacion-informe"
                      type="text"
                      placeholder="Ej: Resolución N° 001-2026-UNAMAD-FI"
                      className="mt-2"
                      value={resAprobacion.nombre}
                      onChange={(e) => resAprobacion.setNombre(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="resolucion-informe">Archivo de Resolución (PDF)</Label>
                    <Input
                      id="resolucion-informe"
                      type="file"
                      accept=".pdf"
                      className="mt-2 cursor-pointer file:cursor-pointer"
                      onChange={(e) => resAprobacion.setArchivo(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={resAprobacion.submit}
                    disabled={resAprobacion.subiendo || !resAprobacion.archivo || !resAprobacion.nombre.trim()}
                  >
                    {resAprobacion.subiendo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Resolución de Aprobación
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Panel de Gestión de Jurados para Informe Final */}
            {esInformeFinal && (
              <Card className="border-2 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                    <Gavel className="w-5 h-5 text-purple-600 shrink-0" />
                    Jurados para Informe Final
                  </CardTitle>
                  <CardDescription>
                    Los jurados del proyecto fueron copiados automáticamente. Puede modificarlos si es necesario antes de que el estudiante envíe su informe final.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Jurados asignados para informe final */}
                  {juradosInforme.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Jurados asignados para informe final:</p>
                      {juradosInforme.map((jurado: any) => (
                        <div key={jurado.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-white dark:bg-background">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{jurado.nombre}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{jurado.email}</p>
                          </div>
                          <Badge className={cn('text-[10px] sm:text-xs shrink-0', TIPO_JURADO_COLORS[jurado.tipo])}>
                            {TIPO_JURADO_LABELS[jurado.tipo]}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                            onClick={() => jurados.remover(jurado.id)}
                            disabled={jurados.procesando}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Indicadores de roles */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-xs', tienePresidenteInforme ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')}>
                      {tienePresidenteInforme ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      Presidente
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', tieneVocalInforme ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')}>
                      {tieneVocalInforme ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      Vocal
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', tieneSecretarioInforme ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')}>
                      {tieneSecretarioInforme ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      Secretario
                    </Badge>
                    <Badge variant="outline" className={cn('text-xs', tieneAccesitarioInforme ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600')}>
                      {tieneAccesitarioInforme ? <CheckCircle className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                      Accesitario
                    </Badge>
                  </div>

                  <Separator />

                  {/* Buscador para agregar/cambiar jurado */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Buscar y agregar jurado:</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Select value={jurados.tipoJurado} onValueChange={jurados.setTipoJurado}>
                        <SelectTrigger className="w-full sm:w-[160px]">
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
                          value={jurados.busqueda}
                          onChange={(e) => jurados.setBusqueda(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Resultados de busqueda */}
                    {(jurados.buscando || jurados.resultados.length > 0) && jurados.busqueda.length >= 2 && (
                      <div className="border rounded-lg max-h-60 overflow-y-auto">
                        {jurados.buscando ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Buscando...</span>
                          </div>
                        ) : jurados.resultados.length === 0 ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            No se encontraron resultados
                          </div>
                        ) : (
                          jurados.resultados.map((resultado) => (
                            <div
                              key={resultado.id}
                              className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                              onClick={() => jurados.asignar(resultado.id)}
                            >
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{resultado.nombreCompleto}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  DNI: {resultado.numeroDocumento} - {resultado.email}
                                </p>
                                {resultado.esDocente && (
                                  <p className="text-xs text-muted-foreground">
                                    Docente - {resultado.departamento || 'Sin departamento'}
                                  </p>
                                )}
                              </div>
                              <Button variant="outline" size="sm" disabled={jurados.procesando} className="shrink-0">
                                <UserPlus className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Asignar</span>
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {!juradosInformeCompletos && (
                    <p className="text-xs text-red-500 text-center">
                      Debe tener Presidente, Vocal, Secretario y Accesitario asignados
                    </p>
                  )}

                  <Separator />

                  {/* Resolución de conformación de jurado evaluador de informe final - solo si aún no se subió */}
                  {!docResolucionJuradoInforme && (
                    <div className="space-y-3">
                      <Separator />
                      <p className="text-sm font-medium flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-amber-600" />
                        Resolución de Conformación de Jurado Evaluador de Informe Final
                      </p>
                      <div>
                        <Label htmlFor="resolucion-jurado-informe">Archivo de Resolución (PDF)</Label>
                        <Input
                          id="resolucion-jurado-informe"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            resJuradoInforme.setArchivo(file)
                            if (file && !resJuradoInforme.nombre.trim()) {
                              resJuradoInforme.setNombre(file.name.replace(/\.pdf$/i, ''))
                            }
                          }}
                          className="mt-1 cursor-pointer file:cursor-pointer"
                        />
                      </div>
                      {resJuradoInforme.archivo && (
                        <div>
                          <Label htmlFor="nombre-resolucion-jurado-informe">Título / Número de Resolución</Label>
                          <Input
                            id="nombre-resolucion-jurado-informe"
                            type="text"
                            placeholder="Ej: Resolución 090-2026-UNAMAD"
                            value={resJuradoInforme.nombre}
                            onChange={(e) => resJuradoInforme.setNombre(e.target.value)}
                            className="mt-1"
                          />
                          <span className="text-xs text-purple-700 dark:text-purple-400 mt-1 block">
                            Ingrese el título de la resolución tal cual aparece en el documento.
                          </span>
                        </div>
                      )}
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={resJuradoInforme.submit}
                        disabled={resJuradoInforme.subiendo || !resJuradoInforme.archivo || !resJuradoInforme.nombre.trim()}
                      >
                        {resJuradoInforme.subiendo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <FileUp className="w-4 h-4 mr-2" />
                            Subir Resolución
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Panel informativo de estados de jurado (read-only) */}
            {['EN_EVALUACION_JURADO', 'OBSERVADA_JURADO', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME'].includes(proyecto.estado) && (
              <Card className="border-2 border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600 shrink-0" />
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

                  {/* Lista de jurados y sus evaluaciones (filtrados por fase actual) */}
                  {(() => {
                    const faseActual = ['EN_EVALUACION_INFORME', 'OBSERVADA_INFORME'].includes(proyecto.estado) ? 'INFORME_FINAL' : 'PROYECTO'
                    const ordenTipos = ['PRESIDENTE', 'VOCAL', 'SECRETARIO', 'ACCESITARIO']
                    const juradosFase = (proyecto.jurados || [])
                      .filter((j: any) => j.fase === faseActual)
                      .sort((a: any, b: any) => ordenTipos.indexOf(a.tipo) - ordenTipos.indexOf(b.tipo))
                    return juradosFase.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Jurados asignados ({faseActual === 'INFORME_FINAL' ? 'Informe Final' : 'Proyecto'}):</p>
                        {juradosFase.map((jurado: any) => {
                          const evalActual = jurado.evaluaciones.find((e: any) => e.ronda === proyecto.rondaActual)
                          return (
                            <div key={jurado.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-white dark:bg-background">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs sm:text-sm truncate">{jurado.nombre}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{jurado.email}</p>
                              </div>
                              <Badge className={cn('text-[10px] sm:text-xs shrink-0', TIPO_JURADO_COLORS[jurado.tipo])}>
                                {TIPO_JURADO_LABELS[jurado.tipo]}
                              </Badge>
                              {evalActual ? (
                                <Badge variant="outline" className={cn(
                                  'text-[10px] sm:text-xs shrink-0',
                                  evalActual.resultado === 'APROBADO' ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'
                                )}>
                                  {evalActual.resultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                                  Pendiente
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Banner APROBADA */}
            {esAprobada && (
              <Card className="border-2 border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                        Tesis Aprobada
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        El informe final de tesis ha sido aprobado por el jurado evaluador.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Banner EN_SUSTENTACION */}
            {esEnSustentacion && (
              <Card className="border-2 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                <CardContent className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-7 h-7 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200">
                        Sustentación Programada
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        El informe final ha sido aprobado. La sustentación ha sido programada.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 sm:ml-[4.5rem] grid gap-3 sm:grid-cols-3">
                    {proyecto.fechaSustentacion && (() => {
                      const inicio = new Date(proyecto.fechaSustentacion)
                      const fin = new Date(inicio.getTime() + 2 * 60 * 60 * 1000)
                      return (
                        <div className="p-3 rounded-lg bg-purple-100/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide mb-1">Fecha y Hora</p>
                          <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                            {inicio.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            {inicio.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} - {fin.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )
                    })()}
                    {proyecto.lugarSustentacion && (
                      <div className="p-3 rounded-lg bg-purple-100/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide mb-1">Lugar</p>
                        <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                          {proyecto.lugarSustentacion}
                        </p>
                      </div>
                    )}
                    {proyecto.modalidadSustentacion && (
                      <div className="p-3 rounded-lg bg-purple-100/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide mb-1">Modalidad</p>
                        <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                          {proyecto.modalidadSustentacion === 'PRESENCIAL' ? 'Presencial' :
                           proyecto.modalidadSustentacion === 'VIRTUAL' ? 'Virtual' : 'Mixta'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Requisitos de Sustentación - Solo en EN_SUSTENTACION */}
            {esEnSustentacion && (
              <>
                {/* Confirmación de vouchers físicos sustentación - solo si no confirmado */}
                {!proyecto.voucherSustentacionFisicoEntregado && (
                <Card className={cn(
                  'border-2',
                  proyecto.voucherSustentacionFisicoEntregado
                    ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                    : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20'
                )}>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                      <Receipt className={cn(
                        'w-5 h-5',
                        proyecto.voucherSustentacionFisicoEntregado ? 'text-green-600' : 'text-yellow-600'
                      )} />
                      Vouchers Físicos Sustentación (Cod. 384 + 466)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {proyecto.voucherSustentacionFisicoEntregado ? (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-200">
                            Vouchers físicos de sustentación recibidos
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Confirmado el {proyecto.voucherSustentacionFisicoFecha
                              ? new Date(proyecto.voucherSustentacionFisicoFecha).toLocaleString('es-PE')
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
                              Vouchers físicos de sustentación pendientes
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              El estudiante debe entregar los vouchers originales (Cod. 384 - S/ 515.00 y Cod. 466 - S/ 36.00).
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={confirmarVoucherSustentacion}
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
                              Confirmar Entrega de Vouchers Físicos
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}

                {/* Confirmación de 4 ejemplares - solo si no confirmado */}
                {!proyecto.ejemplaresEntregados && (
                <Card className={cn(
                  'border-2',
                  proyecto.ejemplaresEntregados
                    ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                    : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20'
                )}>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                      <FileCheck className={cn(
                        'w-5 h-5',
                        proyecto.ejemplaresEntregados ? 'text-green-600' : 'text-yellow-600'
                      )} />
                      4 Ejemplares del Informe Final
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {proyecto.ejemplaresEntregados ? (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-200">
                            4 ejemplares del informe final recibidos
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Confirmado el {proyecto.ejemplaresEntregadosFecha
                              ? new Date(proyecto.ejemplaresEntregadosFecha).toLocaleString('es-PE')
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
                              Ejemplares del informe final pendientes
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              El estudiante debe entregar 4 ejemplares del informe final en folder manila.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={confirmarEjemplares}
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
                              Confirmar Entrega de Ejemplares
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}

                {/* Resolución de Sustentación - solo si aún no se subió */}
                {!docResolucionSustentacion && (() => {
                  const todasConfirmaciones = proyecto.voucherSustentacionFisicoEntregado &&
                    proyecto.ejemplaresEntregados

                  return (
                    <Card className={cn(
                      'border-2',
                      todasConfirmaciones
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20'
                    )}>
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                          <FileUp className={cn('w-5 h-5 shrink-0', todasConfirmaciones ? 'text-emerald-600' : 'text-gray-400')} />
                          Resolución de Sustentación
                        </CardTitle>
                        <CardDescription>
                          {todasConfirmaciones
                            ? 'Todos los requisitos cumplidos. Puede subir la resolución.'
                            : 'Debe confirmar las entregas físicas (vouchers + ejemplares) antes de subir la resolución'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="nombre-resolucion-sustentacion">Título de la Resolución</Label>
                            <Input
                              id="nombre-resolucion-sustentacion"
                              type="text"
                              placeholder="Ej: Resolución N° 001-2026-UNAMAD-FI"
                              disabled={!todasConfirmaciones || resSustentacion.subiendo}
                              value={resSustentacion.nombre}
                              onChange={(e) => resSustentacion.setNombre(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="archivo-resolucion-sustentacion">Archivo PDF de la Resolución</Label>
                            <Input
                              id="archivo-resolucion-sustentacion"
                              type="file"
                              accept=".pdf"
                              disabled={!todasConfirmaciones || resSustentacion.subiendo}
                              onChange={(e) => resSustentacion.setArchivo(e.target.files?.[0] || null)}
                            />
                          </div>
                          <Button
                            onClick={resSustentacion.submit}
                            disabled={!todasConfirmaciones || !resSustentacion.archivo || !resSustentacion.nombre.trim() || resSustentacion.subiendo}
                            className={cn(
                              'w-full',
                              todasConfirmaciones
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-gray-400 cursor-not-allowed'
                            )}
                          >
                            {resSustentacion.subiendo ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Subir Resolución de Sustentación
                              </>
                            )}
                          </Button>
                          {!todasConfirmaciones && (
                            <p className="text-xs text-muted-foreground text-center">
                              Confirme las entregas físicas (vouchers + ejemplares) para habilitar esta opción
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}
              </>
            )}

              </TabsContent>

              {/* Tab: Documentos */}
              <TabsContent value="documentos" className="space-y-6 mt-4">
            {/* Documentos - Informe Final */}
            {mostrarDocsInforme && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-600 shrink-0" />
                    Documentos - Informe Final
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DocumentoCard
                    titulo="Resolucion de Aprobacion"
                    documento={docResolucionAprobacion}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-100 dark:bg-emerald-900/50"
                  />
                  <DocumentoCard
                    titulo="Informe Final de Tesis"
                    documento={docInformeFinal}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100 dark:bg-blue-900/50"
                  />
                  <DocumentoCard
                    titulo="Voucher de Pago - Informe Final (S/ 20.00 - Cod. 465)"
                    documento={docVoucherInforme}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-100 dark:bg-amber-900/50"
                  />
                  <DocumentoCard
                    titulo="Reporte Turnitin (firmado por asesor)"
                    documento={docReporteTurnitin}
                    iconColor="text-red-600"
                    iconBg="bg-red-100 dark:bg-red-900/50"
                  />
                  <DocumentoCard
                    titulo="Acta de Verificacion de Similitud del Asesor"
                    documento={docActaVerificacion}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-100 dark:bg-indigo-900/50"
                  />
                  {(docDictamenInforme || (docDictamen && esAprobada && !docDictamenProyecto)) && (
                    <DocumentoCard
                      titulo="Dictamen de Jurado - Informe Final"
                      documento={docDictamenInforme || docDictamen}
                      iconColor="text-green-600"
                      iconBg="bg-green-100 dark:bg-green-900/50"
                    />
                  )}
                  <DocumentoCard
                    titulo="Resolución de Conformación de Jurado - Informe"
                    documento={docResolucionJuradoInforme}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100 dark:bg-purple-900/50"
                  />
                  {docResolucionSustentacion && (
                    <DocumentoCard
                      titulo="Resolución de Sustentación"
                      documento={docResolucionSustentacion}
                      iconColor="text-green-600"
                      iconBg="bg-green-100 dark:bg-green-900/50"
                    />
                  )}
                  {/* Documentos de sustentación */}
                  {esEnSustentacion && (
                    <>
                      <DocumentoCard
                        titulo="Voucher Alquiler Sala de Grados (Cod. 384)"
                        documento={docVoucherSalaGrados}
                        iconColor="text-amber-600"
                        iconBg="bg-amber-100 dark:bg-amber-900/50"
                      />
                      <DocumentoCard
                        titulo="Voucher Sustentación por Tesista (Cod. 466)"
                        documento={docVoucherSustentacion}
                        iconColor="text-amber-600"
                        iconBg="bg-amber-100 dark:bg-amber-900/50"
                      />
                      <DocumentoCard
                        titulo="Constancia de Inscripción en SUNEDU"
                        documento={docConstanciaSunedu}
                        iconColor="text-blue-600"
                        iconBg="bg-blue-100 dark:bg-blue-900/50"
                      />
                    </>
                  )}
                  {/* Confirmaciones físicas de sustentación */}
                  {proyecto.voucherSustentacionFisicoEntregado && (
                    <div className="rounded-xl border-2 border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm">Vouchers Físicos Sustentación (Cod. 384 + 466)</p>
                          <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                            Recibidos{proyecto.voucherSustentacionFisicoFecha ? ` el ${new Date(proyecto.voucherSustentacionFisicoFecha).toLocaleDateString('es-PE')}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {proyecto.ejemplaresEntregados && (
                    <div className="rounded-xl border-2 border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm">4 Ejemplares del Informe Final</p>
                          <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                            Recibidos{proyecto.ejemplaresEntregadosFecha ? ` el ${new Date(proyecto.ejemplaresEntregadosFecha).toLocaleDateString('es-PE')}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documentos - Aprobacion de Proyecto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  Documentos - Aprobación de Proyecto
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
                {(docDictamenProyecto || (!docDictamenInforme && docDictamen && !mostrarDocsInforme)) && (
                  <DocumentoCard
                    titulo="Dictamen de Jurado - Proyecto"
                    documento={docDictamenProyecto || docDictamen}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-100 dark:bg-emerald-900/50"
                  />
                )}
                {docResolucionJurado && (
                  <DocumentoCard
                    titulo="Resolución de Conformación de Jurado"
                    documento={docResolucionJurado}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100 dark:bg-purple-900/50"
                  />
                )}
              </CardContent>
            </Card>

            {/* Detalles */}
            {(proyecto.resumen || proyecto.lineaInvestigacion || proyecto.palabrasClave.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Detalles del Proyecto</CardTitle>
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

              </TabsContent>

              {/* Tab: Historial */}
              <TabsContent value="historial" className="space-y-6 mt-4">
            {/* Historial */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-start sm:items-center gap-2">
                  <History className="w-5 h-5 text-primary shrink-0" />
                  Historial
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-4">
                  {proyecto.historial.map((item, index) => (
                    <div key={item.id} className="flex gap-2 sm:gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0',
                          ESTADO_CONFIG[item.estadoNuevo]?.bgColor || 'bg-gray-100'
                        )}>
                          {ESTADO_CONFIG[item.estadoNuevo]?.icon || <Clock className="w-4 h-4" />}
                        </div>
                        {index < proyecto.historial.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <p className="font-medium text-xs sm:text-sm">
                          {ESTADO_CONFIG[item.estadoNuevo]?.label || item.estadoNuevo}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {new Date(item.fecha).toLocaleString('es-PE')}
                        </p>
                        {item.comentario && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">{item.comentario}</p>
                        )}
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          Por: {item.realizadoPor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <ProjectSidebar
            proyecto={proyecto}
            esAsignandoJurados={esAsignandoJurados}
            juradosProyecto={juradosProyecto}
            juradosInforme={juradosInforme}
          />
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
