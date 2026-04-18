'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Eye,
  File,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FileUp,
  GraduationCap,
  History,
  Info,
  Loader2,
  Receipt,
  RefreshCw,
  Send,
  Trash2,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn, validarArchivoPDF } from '@/lib/utils'
import { api } from '@/lib/api'
import { useParticipantManager } from '@/hooks/use-participant-manager'
import { FullscreenLoader } from '@/components/ui/fullscreen-loader'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ESTADO_CONFIG,
  ESTADO_ASESOR_CONFIG,
  DocumentUploadCard,
  AdvisorStatusCard,
  ReadOnlyDocumentCard,
  ReadOnlyAdvisorCard,
  ReadOnlyCoauthorCard,
  ThesisSidebar,
  ParticipantDialog,
  formatFileSize,
} from '@/components/tesis'
import type { Documento, Tesis, Participante } from '@/components/tesis'
import { ModalSolicitarDesistimiento } from '@/components/desistimiento/modal-solicitar-desistimiento'

export default function DetalleTesisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [tesis, setTesis] = useState<Tesis | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [respondiendo, setRespondiendo] = useState(false)
  const [mostrarObsAnteriores, setMostrarObsAnteriores] = useState(false)
  const [rechazoDialogOpen, setRechazoDialogOpen] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [invitacionARechazar, setInvitacionARechazar] = useState<string | null>(null)
  const [modalDesistirOpen, setModalDesistirOpen] = useState(false)

  const loadTesis = useCallback(async () => {
    try {
      const data = await api.get<{ data: Tesis }>(`/api/tesis/${id}`)
      setTesis(data.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar tesis')
      router.push('/mis-tesis')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  // Participant manager hook
  const participants = useParticipantManager(tesis, loadTesis)

  useEffect(() => {
    if (!authLoading && user) {
      loadTesis()
    }
  }, [authLoading, user, loadTesis])

  const handleFileUpload = async (tipoDocumento: string, file: File) => {
    if (!tesis) return

    const error = validarArchivoPDF(file)
    if (error) {
      toast.error(error)
      return
    }

    setSubiendo(tipoDocumento)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tipoDocumento', tipoDocumento)

    try {
      await api.post(`/api/tesis/${tesis.id}/documentos`, formData)
      toast.success('Documento subido exitosamente')
      loadTesis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión')
    } finally {
      setSubiendo(null)
    }
  }

  const enviarARevision = async () => {
    if (!tesis) return

    setEnviando(true)
    try {
      await api.post(`/api/tesis/${tesis.id}/enviar`, {})
      toast.success('Proyecto enviado a revisión')
      loadTesis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión')
    } finally {
      setEnviando(false)
    }
  }

  // Responder a invitación (para coautores pendientes)
  const responderInvitacion = async (invitacionId: string, accion: 'ACEPTAR' | 'RECHAZAR', motivo?: string) => {
    setRespondiendo(true)
    try {
      await api.post(`/api/mis-invitaciones/${invitacionId}/responder`, {
        accion,
        ...(accion === 'RECHAZAR' && motivo ? { motivoRechazo: motivo } : {}),
      })
      toast.success(accion === 'ACEPTAR' ? 'Invitación aceptada' : 'Invitación rechazada')
      if (accion === 'RECHAZAR') {
        setRechazoDialogOpen(false)
        setMotivoRechazo('')
        setInvitacionARechazar(null)
      }
      loadTesis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión')
    } finally {
      setRespondiendo(false)
    }
  }

  const abrirRechazoInvitacion = (invitacionId: string) => {
    setInvitacionARechazar(invitacionId)
    setMotivoRechazo('')
    setRechazoDialogOpen(true)
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando proyecto...</p>
      </div>
    )
  }

  if (!tesis) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Proyecto no encontrado</h2>
            <p className="text-muted-foreground mb-4">
              El proyecto de tesis que buscas no existe o no tienes acceso.
            </p>
            <Button asChild>
              <Link href="/mis-tesis">Volver a Mis Tesis</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const estadoConfig = ESTADO_CONFIG[tesis.estado] || ESTADO_CONFIG.BORRADOR
  const miRegistroAutor = tesis.autores.find(a => a.user.id === user?.id)
  const yoDesisti = miRegistroAutor?.estado === 'DESISTIDO'
  const puedeEditar = !yoDesisti && ['BORRADOR', 'OBSERVADA'].includes(tesis.estado)
  const desistimientoPendiente = tesis.desistimientos?.[0] ?? null
  const tieneCoasesor = tesis.asesores.some((a) => a.tipoAsesor === 'COASESOR')

  // Parsear observaciones por documento del historial (para marcar documentos observados)
  const obsMap: Record<string, string> = {}
  let fechaObservacion: Date | null = null
  if (tesis.estado === 'OBSERVADA') {
    const obsEntry = ((tesis as any).historial || []).find(
      (h: any) => h.estadoNuevo === 'OBSERVADA'
    )
    if (obsEntry?.fecha) fechaObservacion = new Date(obsEntry.fecha)
    const obsComentario: string = obsEntry?.comentario || ''
    obsComentario.split('\n').filter((l: string) => l.startsWith('•')).forEach((l: string) => {
      const sinBullet = l.replace(/^•\s*/, '')
      const sep = sinBullet.indexOf(':')
      if (sep !== -1) {
        const docLabel = sinBullet.slice(0, sep).trim()
        const detalle = sinBullet.slice(sep + 1).trim()
        if (docLabel.toLowerCase().includes('proyecto')) obsMap['Proyecto de Tesis'] = detalle
        if (docLabel.toLowerCase().includes('carta') && docLabel.toLowerCase().includes('asesor') && !docLabel.toLowerCase().includes('coasesor'))
          obsMap['Carta de Aceptación del Asesor'] = detalle
        if (docLabel.toLowerCase().includes('carta') && docLabel.toLowerCase().includes('coasesor'))
          obsMap['Carta de Aceptación del Coasesor'] = detalle
        if (docLabel.toLowerCase().includes('voucher')) obsMap['Voucher de Pago'] = detalle
        if (docLabel.toLowerCase().includes('sustentatorio')) obsMap[docLabel] = detalle
      }
    })
  }

  // Verificar si un documento observado ya fue corregido (subido después de la observación)
  const fueCorregido = (doc: { createdAt: string } | undefined, label: string) => {
    if (!obsMap[label] || !doc || !fechaObservacion) return false
    return new Date(doc.createdAt) > fechaObservacion
  }

  // Si hay observaciones activas, los docs que NO están observados fueron verificados
  const hayObsActivas = Object.keys(obsMap).length > 0

  // Verificar si el usuario actual es el autor principal (solo él puede modificar participantes)
  const esAutorPrincipal = tesis.autores.some(
    (a) => a.tipoParticipante === 'AUTOR_PRINCIPAL' && a.user.id === user?.id
  )

  // Verificar si el usuario actual es un coautor con invitación pendiente
  const miRegistroCoautor = tesis.autores.find(
    (a) => a.tipoParticipante === 'COAUTOR' && a.user.id === user?.id
  )
  const miInvitacionPendiente = miRegistroCoautor?.estado === 'PENDIENTE'

  // Verificar documentos
  const docProyecto = tesis.documentos.find((d) => d.tipoDocumento === 'PROYECTO')
  const docCartaAsesor = tesis.documentos.find((d) => d.tipoDocumento === 'CARTA_ACEPTACION_ASESOR')
  const docCartaCoasesor = tesis.documentos.find((d) => d.tipoDocumento === 'CARTA_ACEPTACION_COASESOR')
  const docVoucherPago = tesis.documentos.find((d) => d.tipoDocumento === 'VOUCHER_PAGO')
  const docInformeFinal = tesis.documentos.find((d) => d.tipoDocumento === 'INFORME_FINAL_DOC')
  const docVoucherInforme = tesis.documentos.find((d) => d.tipoDocumento === 'VOUCHER_PAGO_INFORME')
  const docReporteTurnitin = tesis.documentos.find((d) => d.tipoDocumento === 'REPORTE_TURNITIN')
  const docActaVerificacion = tesis.documentos.find((d) => d.tipoDocumento === 'ACTA_VERIFICACION_ASESOR')
  const docResolucionAprobacion = tesis.documentos.find((d) => d.tipoDocumento === 'RESOLUCION_APROBACION')
  const docResolucionJuradoInforme = tesis.documentos.find((d) => d.tipoDocumento === 'RESOLUCION_JURADO_INFORME')
  const docVoucherSalaGrados = tesis.documentos.find((d) => d.tipoDocumento === 'VOUCHER_SALA_GRADOS')
  const docVoucherSustentacion = tesis.documentos.find((d) => d.tipoDocumento === 'VOUCHER_SUSTENTACION')
  const docConstanciaSunedu = tesis.documentos.find((d) => d.tipoDocumento === 'CONSTANCIA_SUNEDU')
  const docResolucionSustentacion = tesis.documentos.find((d) => d.tipoDocumento === 'RESOLUCION_SUSTENTACION')
  const docResolucionJurado = tesis.documentos.find((d) => d.tipoDocumento === 'RESOLUCION_JURADO')
  const docDictamenProyecto = tesis.documentos.find((d) => d.tipoDocumento === 'DICTAMEN_JURADO_PROYECTO')
  const docDictamenInforme = tesis.documentos.find((d) => d.tipoDocumento === 'DICTAMEN_JURADO_INFORME')
  const docDictamen = tesis.documentos.find((d) => d.tipoDocumento === 'DICTAMEN_JURADO')

  // Verificar si se subió documento corregido después de la observación (para estados observados por jurado)
  // historial viene ordenado DESC (más reciente primero), usar find para obtener la observación más reciente
  const fechaObservacionActual = (tesis as any).historial?.find(
    (h: any) => h.estadoNuevo === tesis.estado
  )?.fecha

  const docCorregidoProyectoSubido = tesis.estado === 'OBSERVADA_JURADO'
    ? docProyecto && fechaObservacionActual
      ? new Date(docProyecto.createdAt) > new Date(fechaObservacionActual)
      : false
    : false

  const docCorregidoInformeSubido = tesis.estado === 'OBSERVADA_INFORME'
    ? docInformeFinal && fechaObservacionActual
      ? new Date(docInformeFinal.createdAt) > new Date(fechaObservacionActual)
      : false
    : false
  // Cada tesista sube su propio documento sustentatorio
  // Solo considerar autores activos (excluir DESISTIDO y RECHAZADO)
  const autoresActivos = tesis.autores.filter((a) => a.estado !== 'DESISTIDO' && a.estado !== 'RECHAZADO')
  const allSustentatorios = tesis.documentos.filter((d) => d.tipoDocumento === 'DOCUMENTO_SUSTENTATORIO')
  const miDocSustentatorio = allSustentatorios.find((d) => d.subidoPor?.id === user?.id)
  const otroAutor = autoresActivos.find((a) => a.user.id !== user?.id)
  const docSustentatorioOtroAutor = otroAutor
    ? allSustentatorios.find((d) => d.subidoPor?.id === otroAutor.user.id)
    : null
  const todosSustentatoriosSubidos = autoresActivos.every((a) =>
    allSustentatorios.some((d) => d.subidoPor?.id === a.user.id)
  )

  // Detectar si al usuario le falta su documento sustentatorio en una fase donde no puede editar
  // Esto ocurre cuando un nuevo coautor se agrega o un tesista es promovido post-desistimiento
  const esAutor = tesis.autores.some(a => a.user.id === user?.id && a.estado === 'ACEPTADO')
  const faltaMiSustentatorio = !miDocSustentatorio && !puedeEditar && esAutor
  const necesitaSubirDocumentos = faltaMiSustentatorio && tesis.estado !== 'DESISTIDA' && tesis.estado !== 'RECHAZADA' && tesis.estado !== 'SOLICITUD_DESISTIMIENTO'

  // Obtener estado de asesores
  const asesor = tesis.asesores.find((a) => a.tipoAsesor === 'ASESOR')
  const coasesor = tesis.asesores.find((a) => a.tipoAsesor === 'COASESOR')
  const asesorAcepto = asesor?.estado === 'ACEPTADO'
  const coasesorAcepto = coasesor?.estado === 'ACEPTADO'

  // Obtener estado de coautor activo (excluir desistidos)
  const coautor = autoresActivos.find((a) => a.tipoParticipante === 'COAUTOR')
  const coautorAcepto = coautor?.estado === 'ACEPTADO'
  const coautorRechazado = coautor?.estado === 'RECHAZADO'
  const coautorPendiente = coautor?.estado === 'PENDIENTE'

  // Calcular progreso
  // Requisitos base: 1) Proyecto, 2) Asesor acepta, 3) Carta asesor, 4) Voucher pago, 5) Mi sustentatorio
  // + Coasesor: 6) Coasesor acepta, 7) Carta coasesor
  // + Coautor: 8) Coautor acepta, 9) Sustentatorio coautor
  let requisitosRequeridos = 5 // Proyecto + Asesor acepta + Carta asesor + Voucher + Mi sustentatorio
  if (tieneCoasesor) requisitosRequeridos += 2 // Coasesor acepta + Carta coasesor
  if (coautor) requisitosRequeridos += 2 // Coautor acepta + Sustentatorio coautor

  let requisitosCompletados = 0
  if (docProyecto) requisitosCompletados++
  if (asesorAcepto) requisitosCompletados++
  if (docCartaAsesor) requisitosCompletados++
  if (docVoucherPago) requisitosCompletados++
  if (miDocSustentatorio) requisitosCompletados++
  if (tieneCoasesor && coasesorAcepto) requisitosCompletados++
  if (tieneCoasesor && docCartaCoasesor) requisitosCompletados++
  if (coautor && coautorAcepto) requisitosCompletados++
  if (coautor && docSustentatorioOtroAutor) requisitosCompletados++
  const progresoPercent = Math.round((requisitosCompletados / requisitosRequeridos) * 100)

  // Verificar si puede enviar
  const puedeEnviar = docProyecto &&
    asesorAcepto && docCartaAsesor &&
    docVoucherPago && todosSustentatoriosSubidos &&
    (!tieneCoasesor || (coasesorAcepto && docCartaCoasesor)) &&
    (!coautor || coautorAcepto)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FullscreenLoader
        visible={enviando}
        title="Enviando a revisión"
        description="Registrando los documentos y notificando a mesa de partes..."
      />
      <FullscreenLoader
        visible={reenviando}
        title="Reenviando proyecto"
        description="Enviando las correcciones al jurado evaluador..."
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/mis-tesis" className="hover:text-foreground transition-colors">
          Mis Tesis
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{tesis.codigo}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Button variant="outline" size="icon" asChild className="flex-shrink-0">
          <Link href="/mis-tesis">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className="font-mono">{tesis.codigo}</Badge>
            <Badge className={cn(estadoConfig.bgColor, estadoConfig.color, 'gap-1')}>
              {estadoConfig.icon}
              {estadoConfig.label}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">{tesis.titulo}</h1>
          <p className="text-muted-foreground mt-1">
            {tesis.carreraNombre} • {tesis.facultad.nombre}
          </p>
        </div>
      </div>

      {/* Banner de desistimiento del usuario actual */}
      {yoDesisti && (
        <Card className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Desististe de esta tesis</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Esta tesis es de solo lectura. Puedes verla como referencia histórica.
                  {miRegistroAutor?.motivoRechazo && (
                    <span className="block text-xs mt-1">Motivo: {miRegistroAutor.motivoRechazo}</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner de solicitud de desistimiento en trámite */}
      {tesis.estado === 'SOLICITUD_DESISTIMIENTO' && desistimientoPendiente && (
        <Card className="border-2 border-amber-400 bg-amber-50/80 dark:bg-amber-950/30">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Solicitud de desistimiento en trámite
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Mesa de partes está revisando tu solicitud. No puedes realizar acciones de flujo normal hasta que se resuelva.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  if (!confirm('¿Cancelar tu solicitud de desistimiento?')) return
                  const res = await fetch(`/api/tesis/${tesis.id}/desistir/cancelar`, { method: 'POST' })
                  if (res.ok) { toast.success('Solicitud cancelada'); loadTesis() }
                  else { const d = await res.json(); toast.error(d.error ?? 'Error') }
                }}
              >
                Cancelar solicitud
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado de revisión */}
      {tesis.estado === 'REGISTRO_PENDIENTE' && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">Proyecto en revisión</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Tu proyecto está siendo revisado por el comité. Te notificaremos cuando haya novedades.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {tesis.estado === 'RECHAZADA' && (() => {
        const rechazo = (tesis as any).historial?.find(
          (h: any) => h.estadoNuevo === 'RECHAZADA'
        )
        return (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-200">Proyecto Rechazado</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Tu proyecto de tesis ha sido rechazado por Mesa de Partes. Puedes registrar un nuevo proyecto si lo deseas.
                    </p>
                  </div>
                  {rechazo?.comentario && (
                    <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800">
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1.5">
                        Motivo del Rechazo
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{rechazo.comentario}</p>
                      {rechazo.realizadoPor && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Por: {rechazo.realizadoPor.nombres} {rechazo.realizadoPor.apellidoPaterno}
                          {rechazo.fecha && ` — ${new Date(rechazo.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {tesis.estado === 'EN_REVISION' && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-blue-800 dark:text-blue-200">Proyecto en revisión</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Tu proyecto está siendo revisado por la {tesis.facultad.nombre}. Te notificaremos cuando haya novedades.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estados de jurado */}
      {tesis.estado === 'ASIGNANDO_JURADOS' && (
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-purple-800 dark:text-purple-200">Documentos aprobados - Asignando jurados</p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Tus documentos fueron aprobados por mesa de partes. Se estan asignando jurados evaluadores para tu proyecto.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'EN_EVALUACION_JURADO' && (
        <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30">
          <CardContent className="py-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-indigo-800 dark:text-indigo-200">
                  Proyecto en evaluacion por jurados
                  {(tesis as any).rondaActual > 1 && <Badge variant="outline" className="ml-2 text-[10px]">Ronda {(tesis as any).rondaActual}</Badge>}
                </p>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  Tu proyecto esta siendo evaluado por el jurado asignado.
                  {(tesis as any).fechaLimiteEvaluacion && (
                    <> Fecha limite (dias habiles): {new Date((tesis as any).fechaLimiteEvaluacion).toLocaleDateString('es-PE')}</>
                  )}
                </p>
              </div>
            </div>
            {/* Observaciones de rondas anteriores */}
            {(tesis as any).rondaActual > 1 && (tesis as any).jurados?.some((j: any) => j.evaluaciones?.length > 0) && (
              <div className="ml-14">
                <button
                  onClick={() => setMostrarObsAnteriores(!mostrarObsAnteriores)}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  Observaciones de rondas anteriores
                  {mostrarObsAnteriores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {mostrarObsAnteriores && (
                  <div className="mt-3 space-y-3">
                    {Array.from({ length: (tesis as any).rondaActual - 1 }, (_, i) => i + 1).reverse().map((ronda) => {
                      const juradosConEval = (tesis as any).jurados?.filter((j: any) =>
                        j.evaluaciones?.some((e: any) => e.ronda === ronda)
                      )
                      if (!juradosConEval?.length) return null
                      return (
                        <div key={ronda} className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ronda {ronda}</p>
                          {juradosConEval.map((jurado: any) => {
                            const eval_ = jurado.evaluaciones?.find((e: any) => e.ronda === ronda)
                            if (!eval_) return null
                            return (
                              <div key={jurado.id} className="p-3 rounded-lg bg-white/70 dark:bg-background/50 border">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{jurado.nombre}</span>
                                  <Badge variant="outline" className="text-[10px]">{jurado.tipo}</Badge>
                                  <Badge className={cn('text-[10px]', eval_.resultado === 'APROBADO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                                    {eval_.resultado}
                                  </Badge>
                                </div>
                                {eval_.observaciones && (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{eval_.observaciones}</p>
                                )}
                                {eval_.archivoUrl && (
                                  <a href={eval_.archivoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                                    <FileText className="w-3 h-3" /> Ver archivo adjunto
                                  </a>
                                )}
                              </div>
                            )
                          })}
                          {/* Dictamen de esa ronda */}
                          {(() => {
                            const dictamenRonda = ((tesis as any).dictamenes || []).find((d: any) => d.version === ronda)
                            if (!dictamenRonda) return null
                            return (
                              <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50">
                                <a href={dictamenRonda.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                                  <FileCheck className="w-3 h-3" /> Dictamen - Ronda {ronda}
                                </a>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'OBSERVADA_JURADO' && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <CardContent className="py-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-orange-800 dark:text-orange-200">Proyecto observado por el jurado</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  El jurado ha observado tu proyecto. Revisa las observaciones y sube el proyecto corregido.
                  {(tesis as any).fechaLimiteCorreccion && (
                    <> Tienes hasta el {new Date((tesis as any).fechaLimiteCorreccion).toLocaleDateString('es-PE')} para corregir (dias habiles).</>
                  )}
                </p>
              </div>
            </div>
            {/* Dictamen del jurado */}
            {(() => {
              const dictamenesData = (tesis as any).dictamenes || []
              const dictamenActual = dictamenesData.find((d: any) => d.esVersionActual) || dictamenesData[0]
              if (!dictamenActual) return null
              return (
                <div className="ml-14 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-sm text-indigo-800 dark:text-indigo-200">Dictamen del Jurado</span>
                    <Badge variant="outline" className="text-[10px]">Ronda {dictamenActual.version}</Badge>
                  </div>
                  {dictamenActual.descripcion && (
                    <p className="text-sm text-muted-foreground mb-2">{dictamenActual.descripcion}</p>
                  )}
                  <div className="flex gap-2">
                    <a href={dictamenActual.rutaArchivo} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-300">
                        <Eye className="w-3 h-3 mr-1" /> Ver Dictamen
                      </Button>
                    </a>
                    <a href={dictamenActual.rutaArchivo} download>
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-300">
                        <Download className="w-3 h-3 mr-1" /> Descargar
                      </Button>
                    </a>
                  </div>
                  {dictamenesData.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Dictamenes anteriores:</p>
                      {dictamenesData.filter((d: any) => d.id !== dictamenActual.id).map((d: any) => (
                        <a key={d.id} href={d.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Ronda {d.version} - {new Date(d.createdAt).toLocaleDateString('es-PE')}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
            {/* Mostrar observaciones de cada jurado */}
            {(tesis as any).jurados?.filter((j: any) => j.evaluaciones?.some((e: any) => e.ronda === (tesis as any).rondaActual))?.map((jurado: any) => {
              const eval_ = jurado.evaluaciones?.find((e: any) => e.ronda === (tesis as any).rondaActual)
              if (!eval_) return null
              return (
                <div key={jurado.id} className="p-3 rounded-lg bg-white dark:bg-background border ml-14">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{jurado.nombre}</span>
                    <Badge variant="outline" className="text-[10px]">{jurado.tipo}</Badge>
                    <Badge className={cn('text-[10px]', eval_.resultado === 'APROBADO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                      {eval_.resultado}
                    </Badge>
                  </div>
                  {eval_.observaciones && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{eval_.observaciones}</p>
                  )}
                  {eval_.archivoUrl && (
                    <a href={eval_.archivoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                      <FileText className="w-3 h-3" /> Ver archivo adjunto
                    </a>
                  )}
                </div>
              )
            })}
            {/* Observaciones de rondas anteriores */}
            {(tesis as any).rondaActual > 1 && (
              <div className="ml-14">
                <button
                  onClick={() => setMostrarObsAnteriores(!mostrarObsAnteriores)}
                  className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  Ver observaciones de rondas anteriores
                  {mostrarObsAnteriores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {mostrarObsAnteriores && (
                  <div className="mt-3 space-y-3">
                    {Array.from({ length: (tesis as any).rondaActual - 1 }, (_, i) => i + 1).reverse().map((ronda) => {
                      const juradosConEval = (tesis as any).jurados?.filter((j: any) =>
                        j.evaluaciones?.some((e: any) => e.ronda === ronda)
                      )
                      if (!juradosConEval?.length) return null
                      return (
                        <div key={ronda} className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ronda {ronda}</p>
                          {juradosConEval.map((jurado: any) => {
                            const eval_ = jurado.evaluaciones?.find((e: any) => e.ronda === ronda)
                            if (!eval_) return null
                            return (
                              <div key={jurado.id} className="p-3 rounded-lg bg-white/70 dark:bg-background/50 border">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{jurado.nombre}</span>
                                  <Badge variant="outline" className="text-[10px]">{jurado.tipo}</Badge>
                                  <Badge className={cn('text-[10px]', eval_.resultado === 'APROBADO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                                    {eval_.resultado}
                                  </Badge>
                                </div>
                                {eval_.observaciones && (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{eval_.observaciones}</p>
                                )}
                                {eval_.archivoUrl && (
                                  <a href={eval_.archivoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                                    <FileText className="w-3 h-3" /> Ver archivo adjunto
                                  </a>
                                )}
                              </div>
                            )
                          })}
                          {(() => {
                            const dictamenRonda = ((tesis as any).dictamenes || []).find((d: any) => d.version === ronda)
                            if (!dictamenRonda) return null
                            return (
                              <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50">
                                <a href={dictamenRonda.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                                  <FileCheck className="w-3 h-3" /> Dictamen - Ronda {ronda}
                                </a>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {/* Historial de versiones del proyecto */}
            {(() => {
              const historial = ((tesis as any).historialDocumentos || []).filter((d: any) => d.tipo === 'PROYECTO')
              if (historial.length <= 1) return null
              return (
                <div className="ml-14 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 border">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Historial de Versiones - Proyecto</span>
                  </div>
                  <div className="space-y-1.5">
                    {historial.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={doc.esVersionActual ? 'default' : 'outline'} className="text-[10px]">
                            v{doc.version}{doc.esVersionActual ? ' (actual)' : ''}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(doc.createdAt).toLocaleDateString('es-PE')} - {doc.tamano ? (doc.tamano / (1024 * 1024)).toFixed(1) + ' MB' : ''}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <a href={doc.rutaArchivo} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </a>
                          <a href={doc.rutaArchivo} download>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Download className="w-3 h-3" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
            {/* Upload del proyecto corregido + botón reenviar */}
            <div className="ml-14 space-y-3">
              <p className="text-sm font-medium">Sube el proyecto corregido y reenvia:</p>

              {/* Componente de upload inline */}
              <DocumentUploadCard
                titulo="Proyecto de Tesis Corregido"
                descripcion="Sube el PDF del proyecto corregido con las observaciones levantadas"
                tipoDocumento="PROYECTO"
                documento={tesis.documentos?.find((d: any) => d.tipoDocumento === 'PROYECTO')}
                onUpload={handleFileUpload}
                subiendo={subiendo === 'PROYECTO'}
                accept=".pdf"
                icon={<FileText className="w-6 h-6" />}
                iconColor="text-blue-600"
                iconBg="bg-blue-100 dark:bg-blue-900/50"
              />

              <Button
                onClick={async () => {
                  setReenviando(true)
                  try {
                    const data = await api.post<{ message: string }>(`/api/tesis/${tesis.id}/reenviar-jurado`, {})
                    toast.success(data.message)
                    window.location.reload()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Error de conexión')
                  } finally {
                    setReenviando(false)
                  }
                }}
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={subiendo === 'PROYECTO' || !docCorregidoProyectoSubido || reenviando}
              >
                {reenviando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Reenviar Proyecto Corregido
                  </>
                )}
              </Button>
              {!docCorregidoProyectoSubido && (
                <p className="text-xs text-orange-600 text-center">
                  Debes subir el proyecto corregido antes de poder reenviar
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'PROYECTO_APROBADO' && (
        <Card className="border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 shadow-lg">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-green-800 dark:text-green-200">
                  Proyecto de tesis aprobado por el jurado
                </p>
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700">
                  <div className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="font-semibold text-amber-800 dark:text-amber-200">
                        Pendiente: Resolucion de aprobacion
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Mesa de partes debe subir la resolucion de aprobacion para que pueda pasar a la <span className="font-semibold">fase de informe final</span>. Si tiene consultas, acerquese a mesa de partes de su facultad.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'INFORME_FINAL' && (() => {
        const juradosInformeFinal = ((tesis as any).jurados || []).filter((j: any) => j.fase === 'INFORME_FINAL')
        const tiposJurado = juradosInformeFinal.map((j: any) => j.tipo)
        const juradosCompletos = tiposJurado.includes('PRESIDENTE') && tiposJurado.includes('VOCAL') && tiposJurado.includes('SECRETARIO') && tiposJurado.includes('ACCESITARIO')

        const requisitosInforme = [
          { label: 'Informe Final de Tesis', cumplido: !!docInformeFinal },
          { label: 'Voucher de Pago (S/. 20 - Código 465)', cumplido: !!docVoucherInforme },
          { label: 'Reporte Turnitin firmado por asesor', cumplido: !!docReporteTurnitin },
          { label: 'Acta de verificación de similitud del asesor', cumplido: !!docActaVerificacion },
          { label: 'Resolución de aprobación del proyecto', cumplido: !!docResolucionAprobacion },
        ]
        const cumplidos = requisitosInforme.filter((r) => r.cumplido).length
        const totalRequisitos = requisitosInforme.length
        const todosCompletos = cumplidos === totalRequisitos
        const progreso = Math.round((cumplidos / totalRequisitos) * 100)

        return (
          <Card className="border-2 border-cyan-200 dark:border-cyan-800">
            {/* Header con progreso - siempre visible */}
            <CardContent className="pt-5 pb-4 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/30 dark:to-blue-950/30 border-b">
              <div className="flex items-start gap-3 sm:gap-4 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center shrink-0">
                  <FileUp className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold">Fase de Informe Final</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Completa cada sección para enviar tu informe final a evaluación.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-medium">{cumplidos} de {totalRequisitos} requisitos</span>
                <span className="text-xs sm:text-sm font-bold text-cyan-700 dark:text-cyan-400">{progreso}%</span>
              </div>
              <Progress value={progreso} className="h-2.5" />
              {todosCompletos && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Todos los requisitos están listos. ¡Puedes enviar!
                </p>
              )}
            </CardContent>

            {/* Secciones colapsables */}
            <Accordion type="multiple" defaultValue={[todosCompletos ? '' : 'docs-tesista'].filter(Boolean)} className="px-4 sm:px-6">
              {/* Sección 1: Tus Documentos */}
              <AccordionItem value="docs-tesista">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Tus Documentos</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {[docInformeFinal, docVoucherInforme, docReporteTurnitin, docActaVerificacion].filter(Boolean).length}/4 subidos
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <DocumentUploadCard
                    titulo="Informe Final de Tesis"
                    descripcion="Documento del informe final en formato PDF (máx. 25MB)"
                    tipoDocumento="INFORME_FINAL_DOC"
                    documento={docInformeFinal}
                    onUpload={handleFileUpload}
                    subiendo={subiendo === 'INFORME_FINAL_DOC'}
                    accept=".pdf"
                    icon={<FileText className="w-5 h-5" />}
                    iconColor="text-cyan-600"
                    iconBg="bg-cyan-100 dark:bg-cyan-900/50"
                  />
                  <DocumentUploadCard
                    titulo="Voucher de Pago - Informe Final"
                    descripcion="Voucher de pago de S/. 20.00 al código 465 en formato PDF (máx. 25MB)"
                    tipoDocumento="VOUCHER_PAGO_INFORME"
                    documento={docVoucherInforme}
                    onUpload={handleFileUpload}
                    subiendo={subiendo === 'VOUCHER_PAGO_INFORME'}
                    accept=".pdf"
                    icon={<Receipt className="w-5 h-5" />}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-100 dark:bg-amber-900/50"
                  />
                  {!docVoucherInforme && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 -mt-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Realice el pago de <span className="font-semibold">S/. 20.00</span> al <span className="font-semibold">código 465</span> y suba el voucher escaneado.
                      </p>
                    </div>
                  )}
                  <DocumentUploadCard
                    titulo="Reporte Turnitin"
                    descripcion="Reporte de similitud Turnitin firmado por el asesor en formato PDF (máx. 25MB)"
                    tipoDocumento="REPORTE_TURNITIN"
                    documento={docReporteTurnitin}
                    onUpload={handleFileUpload}
                    subiendo={subiendo === 'REPORTE_TURNITIN'}
                    accept=".pdf"
                    icon={<FileCheck className="w-5 h-5" />}
                    iconColor="text-teal-600"
                    iconBg="bg-teal-100 dark:bg-teal-900/50"
                  />
                  <DocumentUploadCard
                    titulo="Acta de Verificación de Similitud del Asesor"
                    descripcion="Acta firmada por el asesor verificando el porcentaje de similitud en formato PDF (máx. 25MB)"
                    tipoDocumento="ACTA_VERIFICACION_ASESOR"
                    documento={docActaVerificacion}
                    onUpload={handleFileUpload}
                    subiendo={subiendo === 'ACTA_VERIFICACION_ASESOR'}
                    accept=".pdf"
                    icon={<ShieldCheck className="w-5 h-5" />}
                    iconColor="text-violet-600"
                    iconBg="bg-violet-100 dark:bg-violet-900/50"
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Sección 2: Documentos de Mesa de Partes */}
              <AccordionItem value="docs-mesa">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Mesa de Partes y Jurados</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {[docResolucionAprobacion, docResolucionJuradoInforme].filter(Boolean).length}/2 resoluciones
                        {juradosCompletos ? ' · Jurados completos' : ''}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {/* Resolución de Aprobación */}
                  <div className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    docResolucionAprobacion ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10' : 'border-dashed border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/10'
                  )}>
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', docResolucionAprobacion ? 'bg-green-100 dark:bg-green-900/50' : 'bg-orange-100 dark:bg-orange-900/50')}>
                      {docResolucionAprobacion ? <Check className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-orange-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm">Resolución de Aprobación</p>
                      {docResolucionAprobacion ? (
                        <a href={docResolucionAprobacion.archivoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline mt-0.5 inline-block">Ver documento</a>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">Pendiente de mesa de partes</p>
                      )}
                    </div>
                  </div>

                  {/* Resolución de Jurado */}
                  <div className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    docResolucionJuradoInforme ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10' : 'border-dashed border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/10'
                  )}>
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', docResolucionJuradoInforme ? 'bg-green-100 dark:bg-green-900/50' : 'bg-orange-100 dark:bg-orange-900/50')}>
                      {docResolucionJuradoInforme ? <Check className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-orange-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm">Resolución de Conformación de Jurado</p>
                      {docResolucionJuradoInforme ? (
                        <a href={docResolucionJuradoInforme.archivoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline mt-0.5 inline-block">{docResolucionJuradoInforme.nombre}</a>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">Pendiente de mesa de partes</p>
                      )}
                    </div>
                  </div>

                  {/* Jurados */}
                  <div className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    juradosCompletos ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10' : 'border-dashed border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/10'
                  )}>
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', juradosCompletos ? 'bg-green-100 dark:bg-green-900/50' : 'bg-orange-100 dark:bg-orange-900/50')}>
                      {juradosCompletos ? <Check className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-orange-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm">Jurados para Informe Final</p>
                      {juradosCompletos ? (
                        <div className="mt-1 space-y-0.5">
                          {juradosInformeFinal.map((j: any) => (
                            <p key={j.id} className="text-[10px] sm:text-xs text-muted-foreground">
                              {j.tipo === 'PRESIDENTE' ? 'Presidente' : j.tipo === 'VOCAL' ? 'Vocal' : j.tipo === 'SECRETARIO' ? 'Secretario' : 'Accesitario'}: {j.nombre}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1">
                          <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 mb-1">Pendiente de asignación</p>
                          <div className="flex flex-wrap gap-1">
                            {['PRESIDENTE', 'VOCAL', 'SECRETARIO', 'ACCESITARIO'].map((tipo) => (
                              <span key={tipo} className={cn('text-[10px] px-1.5 py-0.5 rounded-full', tiposJurado.includes(tipo) ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
                                {tipo === 'PRESIDENTE' ? 'Pres.' : tipo === 'VOCAL' ? 'Vocal' : tipo === 'SECRETARIO' ? 'Secr.' : 'Acces.'}
                                {tiposJurado.includes(tipo) ? ' ✓' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Botón Enviar - siempre visible al final */}
            <CardContent className="pt-4 pb-5 border-t">
              <Button
                onClick={async () => {
                  setEnviando(true)
                  try {
                    const data = await api.post<{ message: string }>(`/api/tesis/${tesis.id}/enviar-informe`, {})
                    toast.success(data.message)
                    window.location.reload()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Error de conexión')
                  } finally {
                    setEnviando(false)
                  }
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-700 h-11"
                disabled={!todosCompletos || subiendo !== null || enviando}
                size="lg"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Informe Final para Evaluación
                  </>
                )}
              </Button>
              {!todosCompletos && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Completa todos los requisitos para poder enviar el informe final
                </p>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {tesis.estado === 'EN_REVISION_INFORME' && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-blue-800 dark:text-blue-200">Informe final en revisión</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Tu informe final está siendo revisado por mesa de partes. Te notificaremos cuando haya novedades.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'EN_EVALUACION_INFORME' && (
        <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30">
          <CardContent className="py-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-indigo-800 dark:text-indigo-200">
                  Informe final en evaluacion
                  {(tesis as any).rondaActual > 1 && <Badge variant="outline" className="ml-2 text-[10px]">Ronda {(tesis as any).rondaActual}</Badge>}
                </p>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  Tu informe final esta siendo evaluado por el jurado.
                  {(tesis as any).fechaLimiteEvaluacion && (
                    <> Fecha limite (dias habiles): {new Date((tesis as any).fechaLimiteEvaluacion).toLocaleDateString('es-PE')}</>
                  )}
                </p>
              </div>
            </div>
            {/* Observaciones de rondas anteriores (solo jurados de fase INFORME_FINAL) */}
            {(tesis as any).rondaActual > 1 && (tesis as any).jurados?.some((j: any) => j.fase === 'INFORME_FINAL' && j.evaluaciones?.length > 0) && (
              <div className="ml-14">
                <button
                  onClick={() => setMostrarObsAnteriores(!mostrarObsAnteriores)}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  Observaciones de rondas anteriores
                  {mostrarObsAnteriores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {mostrarObsAnteriores && (
                  <div className="mt-3 space-y-3">
                    {Array.from({ length: (tesis as any).rondaActual - 1 }, (_, i) => i + 1).reverse().map((ronda) => {
                      const juradosConEval = (tesis as any).jurados?.filter((j: any) =>
                        j.fase === 'INFORME_FINAL' && j.evaluaciones?.some((e: any) => e.ronda === ronda)
                      )
                      if (!juradosConEval?.length) return null
                      return (
                        <div key={ronda} className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ronda {ronda}</p>
                          {juradosConEval.map((jurado: any) => {
                            const eval_ = jurado.evaluaciones?.find((e: any) => e.ronda === ronda)
                            if (!eval_) return null
                            return (
                              <div key={jurado.id} className="p-3 rounded-lg bg-white/70 dark:bg-background/50 border">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{jurado.nombre}</span>
                                  <Badge variant="outline" className="text-[10px]">{jurado.tipo}</Badge>
                                  <Badge className={cn('text-[10px]', eval_.resultado === 'APROBADO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                                    {eval_.resultado}
                                  </Badge>
                                </div>
                                {eval_.observaciones && (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{eval_.observaciones}</p>
                                )}
                                {eval_.archivoUrl && (
                                  <a href={eval_.archivoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                                    <FileText className="w-3 h-3" /> Ver archivo adjunto
                                  </a>
                                )}
                              </div>
                            )
                          })}
                          {(() => {
                            const dictamenRonda = ((tesis as any).dictamenes || []).find((d: any) => d.version === ronda)
                            if (!dictamenRonda) return null
                            return (
                              <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50">
                                <a href={dictamenRonda.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                                  <FileCheck className="w-3 h-3" /> Dictamen - Ronda {ronda}
                                </a>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'OBSERVADA_INFORME' && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <CardContent className="py-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-orange-800 dark:text-orange-200">Informe final observado por el jurado</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  El jurado ha observado tu informe final. Revisa las observaciones y sube el informe corregido.
                  {(tesis as any).fechaLimiteCorreccion && (
                    <> Tienes hasta el {new Date((tesis as any).fechaLimiteCorreccion).toLocaleDateString('es-PE')} para corregir (dias habiles).</>
                  )}
                </p>
              </div>
            </div>
            {/* Dictamen del jurado */}
            {(() => {
              const dictamenesData = (tesis as any).dictamenes || []
              const dictamenActual = dictamenesData.find((d: any) => d.esVersionActual) || dictamenesData[0]
              if (!dictamenActual) return null
              return (
                <div className="ml-14 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-sm text-indigo-800 dark:text-indigo-200">Dictamen del Jurado</span>
                    <Badge variant="outline" className="text-[10px]">Ronda {dictamenActual.version}</Badge>
                  </div>
                  {dictamenActual.descripcion && (
                    <p className="text-sm text-muted-foreground mb-2">{dictamenActual.descripcion}</p>
                  )}
                  <div className="flex gap-2">
                    <a href={dictamenActual.rutaArchivo} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-300">
                        <Eye className="w-3 h-3 mr-1" /> Ver Dictamen
                      </Button>
                    </a>
                    <a href={dictamenActual.rutaArchivo} download>
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-300">
                        <Download className="w-3 h-3 mr-1" /> Descargar
                      </Button>
                    </a>
                  </div>
                  {dictamenesData.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Dictamenes anteriores:</p>
                      {dictamenesData.filter((d: any) => d.id !== dictamenActual.id).map((d: any) => (
                        <a key={d.id} href={d.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Ronda {d.version} - {new Date(d.createdAt).toLocaleDateString('es-PE')}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
            {/* Mostrar observaciones (solo jurados de fase INFORME_FINAL) */}
            {(tesis as any).jurados?.filter((j: any) => j.fase === 'INFORME_FINAL' && j.evaluaciones?.some((e: any) => e.ronda === (tesis as any).rondaActual))?.map((jurado: any) => {
              const eval_ = jurado.evaluaciones?.find((e: any) => e.ronda === (tesis as any).rondaActual)
              if (!eval_) return null
              return (
                <div key={jurado.id} className="p-3 rounded-lg bg-white dark:bg-background border ml-14">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{jurado.nombre}</span>
                    <Badge variant="outline" className="text-[10px]">{jurado.tipo}</Badge>
                  </div>
                  {eval_.observaciones && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{eval_.observaciones}</p>
                  )}
                </div>
              )
            })}
            {/* Observaciones de rondas anteriores (solo jurados de fase INFORME_FINAL) */}
            {(tesis as any).rondaActual > 1 && (
              <div className="ml-14">
                <button
                  onClick={() => setMostrarObsAnteriores(!mostrarObsAnteriores)}
                  className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  Ver observaciones de rondas anteriores
                  {mostrarObsAnteriores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {mostrarObsAnteriores && (
                  <div className="mt-3 space-y-3">
                    {Array.from({ length: (tesis as any).rondaActual - 1 }, (_, i) => i + 1).reverse().map((ronda) => {
                      const juradosConEval = (tesis as any).jurados?.filter((j: any) =>
                        j.fase === 'INFORME_FINAL' && j.evaluaciones?.some((e: any) => e.ronda === ronda)
                      )
                      if (!juradosConEval?.length) return null
                      return (
                        <div key={ronda} className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ronda {ronda}</p>
                          {juradosConEval.map((jurado: any) => {
                            const eval_ = jurado.evaluaciones?.find((e: any) => e.ronda === ronda)
                            if (!eval_) return null
                            return (
                              <div key={jurado.id} className="p-3 rounded-lg bg-white/70 dark:bg-background/50 border">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{jurado.nombre}</span>
                                  <Badge variant="outline" className="text-[10px]">{jurado.tipo}</Badge>
                                  <Badge className={cn('text-[10px]', eval_.resultado === 'APROBADO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                                    {eval_.resultado}
                                  </Badge>
                                </div>
                                {eval_.observaciones && (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{eval_.observaciones}</p>
                                )}
                                {eval_.archivoUrl && (
                                  <a href={eval_.archivoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                                    <FileText className="w-3 h-3" /> Ver archivo adjunto
                                  </a>
                                )}
                              </div>
                            )
                          })}
                          {(() => {
                            const dictamenRonda = ((tesis as any).dictamenes || []).find((d: any) => d.version === ronda)
                            if (!dictamenRonda) return null
                            return (
                              <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50">
                                <a href={dictamenRonda.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                                  <FileCheck className="w-3 h-3" /> Dictamen - Ronda {ronda}
                                </a>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {/* Historial de versiones del informe */}
            {(() => {
              const historial = ((tesis as any).historialDocumentos || []).filter((d: any) => d.tipo === 'INFORME_FINAL_DOC')
              if (historial.length <= 1) return null
              return (
                <div className="ml-14 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 border">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Historial de Versiones - Informe Final</span>
                  </div>
                  <div className="space-y-1.5">
                    {historial.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={doc.esVersionActual ? 'default' : 'outline'} className="text-[10px]">
                            v{doc.version}{doc.esVersionActual ? ' (actual)' : ''}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(doc.createdAt).toLocaleDateString('es-PE')} - {doc.tamano ? (doc.tamano / (1024 * 1024)).toFixed(1) + ' MB' : ''}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <a href={doc.rutaArchivo} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </a>
                          <a href={doc.rutaArchivo} download>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              <Download className="w-3 h-3" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
            {/* Upload del informe corregido + botón reenviar */}
            <div className="ml-14 space-y-3">
              <p className="text-sm font-medium">Sube el informe final corregido y reenvia:</p>

              <DocumentUploadCard
                titulo="Informe Final Corregido"
                descripcion="Sube el PDF del informe final corregido con las observaciones levantadas"
                tipoDocumento="INFORME_FINAL_DOC"
                documento={tesis.documentos?.find((d: any) => d.tipoDocumento === 'INFORME_FINAL_DOC')}
                onUpload={handleFileUpload}
                subiendo={subiendo === 'INFORME_FINAL_DOC'}
                accept=".pdf"
                icon={<FileText className="w-6 h-6" />}
                iconColor="text-blue-600"
                iconBg="bg-blue-100 dark:bg-blue-900/50"
              />

              <Button
                onClick={async () => {
                  setReenviando(true)
                  try {
                    const data = await api.post<{ message: string }>(`/api/tesis/${tesis.id}/reenviar-jurado`, {})
                    toast.success(data.message)
                    window.location.reload()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Error de conexión')
                  } finally {
                    setReenviando(false)
                  }
                }}
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={subiendo === 'INFORME_FINAL_DOC' || !docCorregidoInformeSubido || reenviando}
              >
                {reenviando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Reenviar Informe Corregido
                  </>
                )}
              </Button>
              {!docCorregidoInformeSubido && (
                <p className="text-xs text-orange-600 text-center">
                  Debes subir el informe corregido antes de poder reenviar
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'APROBADA' && (
        <Card className="border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-green-800 dark:text-green-200">Tesis Aprobada</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  El informe final de tesis ha sido aprobado por el jurado evaluador.
                  {(tesis as any).fechaAprobacion && (
                    <> Fecha de aprobacion: {new Date((tesis as any).fechaAprobacion).toLocaleDateString('es-PE')}.</>
                  )}
                </p>
              </div>
            </div>
            {/* Dictamen final */}
            {(() => {
              const dictamenesData = (tesis as any).dictamenes || []
              const dictamenFinal = dictamenesData.find((d: any) => d.esVersionActual) || dictamenesData[0]
              if (!dictamenFinal) return null
              return (
                <div className="mt-4 ml-16 p-4 rounded-lg bg-green-100/50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-sm text-green-800 dark:text-green-200">Dictamen de Aprobacion</span>
                  </div>
                  {dictamenFinal.descripcion && (
                    <p className="text-sm text-muted-foreground mb-2">{dictamenFinal.descripcion}</p>
                  )}
                  <div className="flex gap-2">
                    <a href={dictamenFinal.rutaArchivo} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="text-green-600 border-green-300">
                        <Eye className="w-3 h-3 mr-1" /> Ver Dictamen
                      </Button>
                    </a>
                    <a href={dictamenFinal.rutaArchivo} download>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-300">
                        <Download className="w-3 h-3 mr-1" /> Descargar
                      </Button>
                    </a>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'EN_SUSTENTACION' && (() => {
        const todosDigitalesSubidos = !!docVoucherSalaGrados && !!docVoucherSustentacion && !!docConstanciaSunedu
        const todasEntregasFisicas = !!(tesis.voucherSustentacionFisicoEntregado && tesis.ejemplaresEntregados)
        const todoCompleto = todosDigitalesSubidos && todasEntregasFisicas
        const docsSubidos = [docVoucherSalaGrados, docVoucherSustentacion, docConstanciaSunedu].filter(Boolean).length
        const entregasFisicas = [tesis.voucherSustentacionFisicoEntregado, tesis.ejemplaresEntregados].filter(Boolean).length

        return (
          <Card className="border-2 border-purple-300 dark:border-purple-800">
            {/* Header - Siempre visible */}
            <CardContent className="pt-5 pb-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-purple-950/30 dark:to-indigo-950/30 border-b">
              <div className="flex items-start gap-3 sm:gap-4 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-purple-800 dark:text-purple-200">Sustentación Programada</h2>
                  <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 mt-0.5">
                    El informe final ha sido aprobado. Completa los requisitos para tu sustentación.
                  </p>
                </div>
              </div>
              {/* Datos de sustentación */}
              {(tesis as any).fechaSustentacion && (
                <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
                  {(() => {
                    const inicio = new Date((tesis as any).fechaSustentacion)
                    const fin = new Date(inicio.getTime() + 2 * 60 * 60 * 1000)
                    return (
                      <div className="p-2.5 sm:p-3 rounded-lg bg-purple-100/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                        <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide mb-0.5">Fecha y Hora</p>
                        <p className="text-xs sm:text-sm font-semibold text-purple-800 dark:text-purple-200">
                          {inicio.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          {inicio.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} - {fin.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )
                  })()}
                  {(tesis as any).lugarSustentacion && (
                    <div className="p-2.5 sm:p-3 rounded-lg bg-purple-100/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide mb-0.5">Lugar</p>
                      <p className="text-xs sm:text-sm font-semibold text-purple-800 dark:text-purple-200">{(tesis as any).lugarSustentacion}</p>
                    </div>
                  )}
                  {(tesis as any).modalidadSustentacion && (
                    <div className="p-2.5 sm:p-3 rounded-lg bg-purple-100/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide mb-0.5">Modalidad</p>
                      <p className="text-xs sm:text-sm font-semibold text-purple-800 dark:text-purple-200">
                        {(tesis as any).modalidadSustentacion === 'PRESENCIAL' ? 'Presencial' : (tesis as any).modalidadSustentacion === 'VIRTUAL' ? 'Virtual' : 'Mixta'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Banner: Listo para sustentar */}
              {todoCompleto && docResolucionSustentacion && (
                <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/40 dark:to-emerald-950/40 border-2 border-green-300 dark:border-green-700 animate-in fade-in zoom-in-95 duration-700">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-green-200 dark:bg-green-800/50 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-green-700 dark:text-green-300" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center animate-bounce" style={{ animationDuration: '2s' }}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm sm:text-base text-green-800 dark:text-green-200">
                        Todo listo para tu sustentación
                      </p>
                      <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 mt-0.5">
                        Todos los documentos y entregas fueron completados. La resolución de sustentación ha sido emitida. ¡Éxitos!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Estado banner */}
              {!docResolucionSustentacion && (
                <div className={cn('flex items-start gap-2 p-2.5 rounded-lg mt-3 border', todoCompleto ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200')}>
                  {todoCompleto ? (
                    <>
                      <Loader2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                      <p className="text-xs text-blue-800 dark:text-blue-200"><span className="font-semibold">Mesa de partes</span> está elaborando la resolución de sustentación.</p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">Completa los requisitos pendientes para que mesa de partes emita la resolución.</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>

            {/* Secciones colapsables */}
            <Accordion type="multiple" defaultValue={docResolucionSustentacion ? ['resolucion'] : ['docs-sustentacion']} className="px-4 sm:px-6">
              {/* Resolución de Sustentación */}
              {docResolucionSustentacion && (
                <AccordionItem value="resolucion">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">Resolución de Sustentación</p>
                        <p className="text-xs text-green-600 font-normal">Emitida</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700">
                      <FileCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200 truncate">{docResolucionSustentacion.nombre}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <a href={docResolucionSustentacion.archivoUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300">
                              <Eye className="w-3 h-3 mr-1" /> Ver
                            </Button>
                          </a>
                          <a href={docResolucionSustentacion.archivoUrl} download>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300">
                              <Download className="w-3 h-3 mr-1" /> Descargar
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Documentos digitales */}
              <AccordionItem value="docs-sustentacion">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                      <Upload className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Documentos Digitales</p>
                      <p className={cn('text-xs font-normal', docsSubidos === 3 ? 'text-green-600' : 'text-muted-foreground')}>{docsSubidos}/3 subidos</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <DocumentUploadCard
                    titulo="Voucher Sala de Grados (Cod. 384)"
                    descripcion="Voucher S/ 515.00 - Alquiler Sala de Grados por 02 horas (PDF, máx. 25MB)"
                    tipoDocumento="VOUCHER_SALA_GRADOS"
                    documento={docVoucherSalaGrados}
                    onUpload={handleFileUpload}
                    subiendo={subiendo === 'VOUCHER_SALA_GRADOS'}
                    accept=".pdf"
                    icon={<Receipt className="w-5 h-5" />}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-100 dark:bg-amber-900/50"
                  />
                  <DocumentUploadCard
                    titulo="Voucher Sustentación por Tesista (Cod. 466)"
                    descripcion="Voucher S/ 36.00 - Sustentación de tesis por cada tesista (PDF, máx. 25MB)"
                    tipoDocumento="VOUCHER_SUSTENTACION"
                    documento={docVoucherSustentacion}
                    onUpload={handleFileUpload}
                    subiendo={subiendo === 'VOUCHER_SUSTENTACION'}
                    accept=".pdf"
                    icon={<Receipt className="w-5 h-5" />}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-100 dark:bg-amber-900/50"
                  />
                  <DocumentUploadCard
                    titulo="Constancia de Inscripción en SUNEDU"
                    descripcion="Constancia de inscripción en SUNEDU con grado bachiller (PDF, máx. 25MB)"
                    tipoDocumento="CONSTANCIA_SUNEDU"
                    documento={docConstanciaSunedu}
                    onUpload={handleFileUpload}
                    subiendo={subiendo === 'CONSTANCIA_SUNEDU'}
                    accept=".pdf"
                    icon={<ShieldCheck className="w-5 h-5" />}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100 dark:bg-blue-900/50"
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Entregas físicas */}
              <AccordionItem value="entregas-fisicas">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', todasEntregasFisicas ? 'bg-green-100 dark:bg-green-900/50' : 'bg-indigo-100 dark:bg-indigo-900/50')}>
                      {todasEntregasFisicas ? <Check className="w-4 h-4 text-green-600" /> : <FileCheck className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Entregas Físicas</p>
                      <p className={cn('text-xs font-normal', todasEntregasFisicas ? 'text-green-600' : 'text-muted-foreground')}>{entregasFisicas}/2 confirmadas</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    tesis.voucherSustentacionFisicoEntregado
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
                  )}>
                    {tesis.voucherSustentacionFisicoEntregado ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs sm:text-sm font-medium', tesis.voucherSustentacionFisicoEntregado ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400')}>
                        Vouchers originales (Cod. 384 + 466)
                      </p>
                      {tesis.voucherSustentacionFisicoFecha && (
                        <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                          Confirmado el {new Date(tesis.voucherSustentacionFisicoFecha).toLocaleDateString('es-PE')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    tesis.ejemplaresEntregados
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
                  )}>
                    {tesis.ejemplaresEntregados ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs sm:text-sm font-medium', tesis.ejemplaresEntregados ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400')}>
                        4 ejemplares del informe final en folder manila
                      </p>
                      {tesis.ejemplaresEntregadosFecha && (
                        <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                          Confirmado el {new Date(tesis.ejemplaresEntregadosFecha).toLocaleDateString('es-PE')}
                        </p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )
      })()}

      {/* Banner de invitación pendiente para coautores */}
      {miInvitacionPendiente && miRegistroCoautor && (
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-purple-800 dark:text-purple-200">
                  Tienes una invitación pendiente
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                  Has sido invitado como Tesista 2 en este proyecto. Debes aceptar la invitación antes de poder subir documentos.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => responderInvitacion(miRegistroCoautor.id, 'ACEPTAR')}
                    disabled={respondiendo}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {respondiendo ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    Aceptar invitación
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirRechazoInvitacion(miRegistroCoautor.id)}
                    disabled={respondiendo}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Rechazar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alerta cuando el coautor rechazó la invitación */}
          {puedeEditar && esAutorPrincipal && coautorRechazado && coautor && (
            <Card className="border-2 border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-red-800 dark:text-red-200">
                      {coautor.user.nombres} {coautor.user.apellidoPaterno} rechazó la invitación
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      El coautor no aceptó participar en esta tesis. No podrás enviar el proyecto hasta que reemplaces o elimines al coautor.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => participants.abrirReemplazo('COAUTOR', coautor.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reemplazar por otro estudiante
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => participants.eliminar('COAUTOR', coautor.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Continuar sin coautor
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerta cuando el coautor tiene invitación pendiente */}
          {puedeEditar && esAutorPrincipal && coautorPendiente && coautor && (
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                      Esperando respuesta de {coautor.user.nombres} {coautor.user.apellidoPaterno}
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                      Se envió una invitación como coautor. Recibirás una notificación cuando responda.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documentos requeridos */}
          {puedeEditar && !miInvitacionPendiente && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Documentos Requeridos</CardTitle>
                    <CardDescription>
                      Sube los documentos para completar tu registro
                    </CardDescription>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">Progreso de requisitos</span>
                    <span className={cn(
                      'font-semibold',
                      progresoPercent === 100 ? 'text-green-600' : 'text-muted-foreground'
                    )}>
                      {requisitosCompletados} de {requisitosRequeridos} completados
                    </span>
                  </div>
                  <Progress value={progresoPercent} className="h-2" />
                  {progresoPercent === 100 && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Todos los requisitos están listos
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Proyecto de Tesis - El estudiante sube este documento */}
                <DocumentUploadCard
                  titulo="Proyecto de Tesis"
                  descripcion="Documento del proyecto en formato PDF (máx. 25MB)"
                  tipoDocumento="PROYECTO"
                  documento={docProyecto}
                  onUpload={handleFileUpload}
                  subiendo={subiendo === 'PROYECTO'}
                  accept=".pdf"
                  icon={<FileText className="w-5 h-5" />}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-100 dark:bg-blue-900/50"
                  observado={obsMap['Proyecto de Tesis']}
                  verificado={hayObsActivas && !obsMap['Proyecto de Tesis']}
                  corregido={fueCorregido(docProyecto, 'Proyecto de Tesis')}
                />

                {/* Estado de Aceptación del Asesor - El asesor sube y firma */}
                {asesor && (
                  <AdvisorStatusCard
                    titulo="Carta de Aceptación del Asesor"
                    descripcion="El asesor debe subir su carta de aceptación"
                    tipoAsesor="Asesor"
                    asesor={asesor}
                    documento={docCartaAsesor}
                    icon={<GraduationCap className="w-5 h-5" />}
                    iconColor="text-green-600"
                    iconBg="bg-green-100 dark:bg-green-900/50"
                    observado={obsMap['Carta de Aceptación del Asesor']}
                    verificado={hayObsActivas && !obsMap['Carta de Aceptación del Asesor']}
                  />
                )}

                {/* Estado de Aceptación del Coasesor - El coasesor sube y firma */}
                {coasesor && (
                  <AdvisorStatusCard
                    titulo="Carta de Aceptación del Coasesor"
                    descripcion="El coasesor debe subir su carta de aceptación"
                    tipoAsesor="Coasesor"
                    asesor={coasesor}
                    documento={docCartaCoasesor}
                    icon={<Users className="w-5 h-5" />}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100 dark:bg-purple-900/50"
                    observado={obsMap['Carta de Aceptación del Coasesor']}
                    verificado={hayObsActivas && !obsMap['Carta de Aceptación del Coasesor']}
                  />
                )}

                {/* Voucher de Pago */}
                <DocumentUploadCard
                  titulo="Voucher de Pago"
                  descripcion="Voucher de pago de S/. 30.00 al código 277 en formato PDF (máx. 25MB)"
                  tipoDocumento="VOUCHER_PAGO"
                  documento={docVoucherPago}
                  onUpload={handleFileUpload}
                  subiendo={subiendo === 'VOUCHER_PAGO'}
                  accept=".pdf"
                  icon={<Receipt className="w-5 h-5" />}
                  iconColor="text-amber-600"
                  iconBg="bg-amber-100 dark:bg-amber-900/50"
                  observado={obsMap['Voucher de Pago']}
                  verificado={hayObsActivas && !obsMap['Voucher de Pago']}
                  corregido={fueCorregido(docVoucherPago, 'Voucher de Pago')}
                />
                {!docVoucherPago ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border -mt-2">
                    <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Realice el pago de <span className="font-semibold">S/. 30.00</span> al <span className="font-semibold">código 277</span> y suba el voucher escaneado.
                    </p>
                  </div>
                ) : null}

                {/* Mi Documento Sustentatorio */}
                <DocumentUploadCard
                  titulo={otroAutor ? 'Tu Documento Sustentatorio' : 'Documento Sustentatorio'}
                  descripcion="Documento que acredite que se encuentra como mínimo en el VIII semestre o superior (PDF, máx. 25MB)"
                  tipoDocumento="DOCUMENTO_SUSTENTATORIO"
                  documento={miDocSustentatorio}
                  onUpload={handleFileUpload}
                  subiendo={subiendo === 'DOCUMENTO_SUSTENTATORIO'}
                  accept=".pdf"
                  icon={<FileSpreadsheet className="w-5 h-5" />}
                  iconColor="text-indigo-600"
                  iconBg="bg-indigo-100 dark:bg-indigo-900/50"
                  observado={
                    // Buscar observación que mencione "sustentatorio" + nombre del usuario
                    Object.entries(obsMap).find(([key]) =>
                      key.toLowerCase().includes('sustentatorio') &&
                      user && key.toLowerCase().includes(user.nombres?.toLowerCase() || '---')
                    )?.[1]
                  }
                  verificado={hayObsActivas && !Object.entries(obsMap).some(([key]) =>
                    key.toLowerCase().includes('sustentatorio') &&
                    user && key.toLowerCase().includes(user.nombres?.toLowerCase() || '---')
                  )}
                  corregido={(() => {
                    const obsKey = Object.keys(obsMap).find(key =>
                      key.toLowerCase().includes('sustentatorio') &&
                      user && key.toLowerCase().includes(user.nombres?.toLowerCase() || '---')
                    )
                    return obsKey ? fueCorregido(miDocSustentatorio ?? undefined, obsKey) : false
                  })()}
                />
                {!miDocSustentatorio && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border -mt-2">
                    <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground">
                      <p className="mb-1 font-semibold text-amber-600 dark:text-amber-400">El documento debe acreditar que el estudiante se encuentra como mínimo en el octavo semestre (VIII) o superior.</p>
                      <p className="mb-1">Suba <span className="font-semibold">uno</span> de los siguientes documentos según su condición:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li><span className="font-medium">Ficha de matrícula</span> — si está matriculado en el semestre actual (mínimo VIII ciclo)</li>
                        <li><span className="font-medium">Inscripción a SUNEDU</span> — si cuenta con registro en SUNEDU</li>
                        <li><span className="font-medium">Constancia de egresado</span> — si ya egresó de la carrera</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Sustentatorio del otro tesista (si existe) */}
                {otroAutor && (() => {
                  const otroNombre = `${otroAutor.user.nombres} ${otroAutor.user.apellidoPaterno}`
                  const obsOtro = Object.entries(obsMap).find(([key]) =>
                    key.toLowerCase().includes('sustentatorio') &&
                    key.toLowerCase().includes(otroAutor.user.nombres.toLowerCase())
                  )?.[1]
                  const verificadoOtro = hayObsActivas && !obsOtro && !!docSustentatorioOtroAutor
                  return (
                    <div className={cn(
                      'rounded-xl border-2 p-4 transition-all',
                      obsOtro
                        ? 'border-orange-400 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20'
                        : docSustentatorioOtroAutor
                          ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                          : 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20'
                    )}>
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                          obsOtro
                            ? 'bg-orange-100 dark:bg-orange-900/50'
                            : docSustentatorioOtroAutor
                              ? 'bg-green-100 dark:bg-green-900/50'
                              : 'bg-yellow-100 dark:bg-yellow-900/50'
                        )}>
                          {obsOtro ? (
                            <AlertCircle className="w-6 h-6 text-orange-600" />
                          ) : docSustentatorioOtroAutor ? (
                            <FileCheck className="w-6 h-6 text-green-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-sm">
                              Sustentatorio de {otroNombre}
                            </p>
                            {obsOtro ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500 text-orange-600">
                                Observado
                              </Badge>
                            ) : verificadoOtro ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                                Verificado
                              </Badge>
                            ) : docSustentatorioOtroAutor ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                                Subido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500 text-yellow-600">
                                Pendiente
                              </Badge>
                            )}
                          </div>
                          {obsOtro ? (
                            <p className="text-xs text-orange-600 dark:text-orange-400">{obsOtro}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {docSustentatorioOtroAutor
                                ? `${otroAutor.user.nombres} ya subió su documento sustentatorio`
                                : otroAutor.estado === 'PENDIENTE'
                                  ? `${otroAutor.user.nombres} debe aceptar la invitación antes de subir su documento`
                                  : `${otroAutor.user.nombres} debe subir su propio documento sustentatorio`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Botón enviar */}
                <Separator className="my-6" />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="text-center sm:text-left">
                    <p className="font-medium">¿Listo para enviar?</p>
                    <p className="text-sm text-muted-foreground">
                      {puedeEnviar
                        ? 'Todos los requisitos están completos'
                        : !docProyecto
                          ? 'Falta subir el proyecto de tesis'
                          : coautorRechazado
                            ? 'El coautor rechazó participar. Debe actualizar el equipo.'
                            : coautorPendiente
                              ? 'Esperando que el coautor acepte la invitación'
                              : !asesorAcepto
                                ? 'Esperando que el asesor acepte la asesoría'
                                : !docCartaAsesor
                                  ? 'Esperando que el asesor suba su carta de aceptación'
                                  : tieneCoasesor && !coasesorAcepto
                                    ? 'Esperando que el coasesor acepte la asesoría'
                                    : tieneCoasesor && !docCartaCoasesor
                                      ? 'Esperando que el coasesor suba su carta de aceptación'
                                      : !docVoucherPago
                                        ? 'Falta subir el voucher de pago (S/. 30.00 - código 277)'
                                        : !miDocSustentatorio
                                          ? 'Falta subir tu documento sustentatorio'
                                          : otroAutor && !docSustentatorioOtroAutor
                                            ? `Falta el documento sustentatorio de ${otroAutor.user.nombres} ${otroAutor.user.apellidoPaterno}`
                                            : 'Completando requisitos pendientes'}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={enviarARevision}
                    disabled={enviando || !puedeEnviar || tesis.estado === 'SOLICITUD_DESISTIMIENTO'}
                    className={cn(
                      puedeEnviar && tesis.estado !== 'SOLICITUD_DESISTIMIENTO' && 'bg-green-600 hover:bg-green-700'
                    )}
                  >
                    {enviando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar a Revisión
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documentos y Estado (solo lectura - cuando NO puede editar O coautor no aceptó) */}
          {(!puedeEditar || miInvitacionPendiente) && (() => {
            const enFaseInforme = ['INFORME_FINAL', 'EN_REVISION_INFORME', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME', 'APROBADA', 'EN_SUSTENTACION'].includes(tesis.estado)

            const docsProyectoContent = (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">Documentos - Aprobación de Proyecto</CardTitle>
                      <CardDescription>
                        Documentos presentados para la aprobación del proyecto de tesis
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReadOnlyDocumentCard
                    titulo="Proyecto de Tesis"
                    documento={docProyecto}
                    icon={<FileText className="w-5 h-5" />}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100 dark:bg-blue-900/50"
                  />
                  {asesor && (
                    <ReadOnlyAdvisorCard
                      titulo="Asesor"
                      asesor={asesor}
                      documento={docCartaAsesor}
                    />
                  )}
                  {coasesor && (
                    <ReadOnlyAdvisorCard
                      titulo="Coasesor"
                      asesor={coasesor}
                      documento={docCartaCoasesor}
                    />
                  )}
                  <ReadOnlyDocumentCard
                    titulo="Voucher de Pago"
                    documento={docVoucherPago}
                    icon={<Receipt className="w-5 h-5" />}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-100 dark:bg-amber-900/50"
                  />
                  <ReadOnlyDocumentCard
                    titulo={otroAutor ? 'Tu Documento Sustentatorio' : 'Documento Sustentatorio'}
                    documento={miDocSustentatorio}
                    icon={<FileSpreadsheet className="w-5 h-5" />}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-100 dark:bg-indigo-900/50"
                  />
                  {otroAutor && (
                    <ReadOnlyDocumentCard
                      titulo={`Sustentatorio de ${otroAutor.user.nombres} ${otroAutor.user.apellidoPaterno}`}
                      documento={docSustentatorioOtroAutor ?? undefined}
                      icon={<FileSpreadsheet className="w-5 h-5" />}
                      iconColor="text-indigo-600"
                      iconBg="bg-indigo-100 dark:bg-indigo-900/50"
                    />
                  )}
                  {coautor && (
                    <ReadOnlyCoauthorCard
                      coautor={coautor}
                    />
                  )}
                  {docResolucionJurado && (
                    <ReadOnlyDocumentCard
                      titulo="Resolución de Conformación de Jurado"
                      documento={docResolucionJurado}
                      icon={<FileCheck className="w-5 h-5" />}
                      iconColor="text-purple-600"
                      iconBg="bg-purple-100 dark:bg-purple-900/50"
                    />
                  )}
                  {(docDictamenProyecto || docDictamen) && (
                    <ReadOnlyDocumentCard
                      titulo="Dictamen de Jurado - Proyecto"
                      documento={docDictamenProyecto || docDictamen}
                      icon={<FileCheck className="w-5 h-5" />}
                      iconColor="text-emerald-600"
                      iconBg="bg-emerald-100 dark:bg-emerald-900/50"
                    />
                  )}
                  {docResolucionAprobacion && (
                    <ReadOnlyDocumentCard
                      titulo="Resolución de Aprobación del Proyecto"
                      documento={docResolucionAprobacion}
                      icon={<FileCheck className="w-5 h-5" />}
                      iconColor="text-green-600"
                      iconBg="bg-green-100 dark:bg-green-900/50"
                    />
                  )}
                </CardContent>
              </Card>
            )

            const docsInformeContent = (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">Documentos - Informe Final</CardTitle>
                      <CardDescription>
                        Documentos presentados para la evaluación del informe final
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ReadOnlyDocumentCard
                    titulo="Informe Final de Tesis"
                    documento={docInformeFinal}
                    icon={<FileText className="w-5 h-5" />}
                    iconColor="text-cyan-600"
                    iconBg="bg-cyan-100 dark:bg-cyan-900/50"
                  />
                  <ReadOnlyDocumentCard
                    titulo="Voucher de Pago - Informe Final (S/. 20 - Código 465)"
                    documento={docVoucherInforme}
                    icon={<Receipt className="w-5 h-5" />}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-100 dark:bg-amber-900/50"
                  />
                  <ReadOnlyDocumentCard
                    titulo="Reporte Turnitin firmado por asesor"
                    documento={docReporteTurnitin}
                    icon={<FileCheck className="w-5 h-5" />}
                    iconColor="text-green-600"
                    iconBg="bg-green-100 dark:bg-green-900/50"
                  />
                  <ReadOnlyDocumentCard
                    titulo="Acta de Verificación de Similitud del Asesor"
                    documento={docActaVerificacion}
                    icon={<ShieldCheck className="w-5 h-5" />}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100 dark:bg-purple-900/50"
                  />
                  <ReadOnlyDocumentCard
                    titulo="Resolución de Aprobación del Proyecto"
                    documento={docResolucionAprobacion}
                    icon={<FileCheck className="w-5 h-5" />}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-100 dark:bg-emerald-900/50"
                  />
                  {docResolucionJuradoInforme && (
                    <ReadOnlyDocumentCard
                      titulo="Resolución de Conformación de Jurado - Informe"
                      documento={docResolucionJuradoInforme}
                      icon={<FileCheck className="w-5 h-5" />}
                      iconColor="text-purple-600"
                      iconBg="bg-purple-100 dark:bg-purple-900/50"
                    />
                  )}
                  {(docDictamenInforme || (docDictamen && !docDictamenProyecto)) && (
                    <ReadOnlyDocumentCard
                      titulo="Dictamen de Jurado - Informe Final"
                      documento={docDictamenInforme || docDictamen}
                      icon={<FileCheck className="w-5 h-5" />}
                      iconColor="text-green-600"
                      iconBg="bg-green-100 dark:bg-green-900/50"
                    />
                  )}
                  {docResolucionSustentacion && (
                    <ReadOnlyDocumentCard
                      titulo="Resolución de Sustentación"
                      documento={docResolucionSustentacion}
                      icon={<FileCheck className="w-5 h-5" />}
                      iconColor="text-green-600"
                      iconBg="bg-green-100 dark:bg-green-900/50"
                    />
                  )}
                </CardContent>
              </Card>
            )

            const historialItems = ((tesis as any).historial || []) as { id?: string; estadoNuevo: string; fecha: string; comentario?: string; realizadoPor?: any }[]

            // Si estamos en fase de informe final, mostrar con Tabs
            if (enFaseInforme) {
              return (
                <Tabs defaultValue="informe" className="w-full min-w-0">
                  <div className="overflow-x-auto">
                    <TabsList className="w-full grid grid-cols-3 h-10 min-w-[300px]">
                      <TabsTrigger value="informe" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                        <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>Informe Final</span>
                      </TabsTrigger>
                      <TabsTrigger value="proyecto" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>Proyecto</span>
                      </TabsTrigger>
                      <TabsTrigger value="historial" className="gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
                        <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>Historial</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="informe" className="mt-4 space-y-4">
                    {docsInformeContent}
                  </TabsContent>
                  <TabsContent value="proyecto" className="mt-4 space-y-4">
                    {docsProyectoContent}
                  </TabsContent>
                  <TabsContent value="historial" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <History className="w-5 h-5 text-primary shrink-0" />
                          Historial de la Tesis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {historialItems.length > 0 ? (
                          <div className="space-y-4">
                            {historialItems.map((item, index) => {
                              const config = ESTADO_CONFIG[item.estadoNuevo]
                              return (
                                <div key={item.id || index} className="flex gap-2 sm:gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={cn(
                                      'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0',
                                      config?.bgColor || 'bg-gray-100 dark:bg-gray-800'
                                    )}>
                                      {config?.icon || <Clock className="w-4 h-4" />}
                                    </div>
                                    {index < historialItems.length - 1 && (
                                      <div className="w-0.5 flex-1 bg-border mt-2" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pb-4">
                                    <p className="font-medium text-xs sm:text-sm">
                                      {config?.label || item.estadoNuevo}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                                      {new Date(item.fecha).toLocaleString('es-PE')}
                                    </p>
                                    {item.comentario && (
                                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words bg-muted/50 p-2 rounded-lg">{item.comentario}</p>
                                    )}
                                    {item.realizadoPor && (
                                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                        Por: {typeof item.realizadoPor === 'string' ? item.realizadoPor : `${item.realizadoPor.nombres || ''} ${item.realizadoPor.apellidoPaterno || ''}`.trim() || 'Sistema'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <History className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No hay registros de historial</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )
            }

            // Si NO estamos en fase de informe, mostrar sin tabs (como antes)
            return docsProyectoContent
          })()}
        </div>

        {/* Sidebar */}
        <ThesisSidebar
          tesis={tesis}
          puedeEditar={puedeEditar}
          puedeGestionarParticipantes={puedeEditar || tesis.estado === 'ASIGNANDO_JURADOS'}
          esAutorPrincipal={esAutorPrincipal}
          coautor={coautor}
          coasesor={coasesor}
          onReemplazar={participants.abrirReemplazo}
          onEliminar={participants.eliminar}
          onAgregar={participants.abrirAgregar}
        />
      </div>

      {/* Panel de documento sustentatorio faltante (para autores agregados/promovidos en fases avanzadas) */}
      {necesitaSubirDocumentos && (
        <div className="mt-6">
          <Card className="border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                Documento Sustentatorio Pendiente
              </CardTitle>
              <CardDescription>
                Debes subir tu documento sustentatorio para completar tu expediente en esta tesis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 border">
                <p className="mb-1 font-semibold text-amber-600 dark:text-amber-400">El documento debe acreditar que te encuentras como mínimo en el octavo semestre (VIII) o superior.</p>
                <p className="mb-1">Sube <span className="font-semibold">uno</span> de los siguientes:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li><span className="font-medium">Ficha de matrícula</span> — si estás matriculado (mínimo VIII ciclo)</li>
                  <li><span className="font-medium">Inscripción a SUNEDU</span> — si cuentas con registro</li>
                  <li><span className="font-medium">Constancia de egresado</span> — si ya egresaste</li>
                </ul>
              </div>
              <input
                type="file"
                accept=".pdf"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer file:cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload('DOCUMENTO_SUSTENTATORIO', file)
                }}
                disabled={subiendo === 'DOCUMENTO_SUSTENTATORIO'}
              />
              {subiendo === 'DOCUMENTO_SUSTENTATORIO' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo documento...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Diálogo de rechazo de invitación */}
      <Dialog open={rechazoDialogOpen} onOpenChange={setRechazoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar invitación</DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual rechazas participar como coautor en esta tesis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Escribe el motivo del rechazo..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              disabled={respondiendo}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setRechazoDialogOpen(false); setMotivoRechazo(''); setInvitacionARechazar(null) }}
              disabled={respondiendo}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => invitacionARechazar && responderInvitacion(invitacionARechazar, 'RECHAZAR', motivoRechazo.trim())}
              disabled={respondiendo || !motivoRechazo.trim()}
            >
              {respondiendo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Confirmar rechazo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de agregar/reemplazar participante */}
      <ParticipantDialog
        open={participants.dialogOpen}
        onOpenChange={(open) => { if (!open) participants.cerrar() }}
        modo={participants.modoDialogo}
        tipo={participants.tipoReemplazo}
        busqueda={participants.busqueda}
        onBusquedaChange={participants.setBusqueda}
        buscando={participants.buscando}
        resultados={participants.resultados}
        seleccionado={participants.participanteSeleccionado}
        onSeleccionar={participants.setParticipanteSeleccionado}
        reemplazando={participants.reemplazando}
        onConfirmar={participants.ejecutar}
      />

      {/* Botón para solicitar desistimiento (solo para el autor principal, en estados activos) */}
      {esAutorPrincipal && !yoDesisti && !['DESISTIDA', 'RECHAZADA', 'SUSTENTADA', 'SOLICITUD_DESISTIMIENTO'].includes(tesis.estado) && (
        <div className="pt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setModalDesistirOpen(true)}
          >
            <Ban className="w-4 h-4 mr-2" />
            Solicitar desistimiento
          </Button>
        </div>
      )}

      <ModalSolicitarDesistimiento
        open={modalDesistirOpen}
        onOpenChange={setModalDesistirOpen}
        thesisId={tesis.id}
        tituloTesis={tesis.titulo}
        onSuccess={() => loadTesis()}
      />
    </div>
  )
}

