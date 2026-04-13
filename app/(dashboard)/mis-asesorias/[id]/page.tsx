'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { FIRMA_PERU_PORT, FIRMA_PERU_STATIC_TOKEN, type FirmaPeruParams } from '@/lib/firma-peru'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  File,
  FileCheck,
  FileSignature,
  FileText,
  Gavel,
  GraduationCap,
  History,
  Loader2,
  PenTool,
  Receipt,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// Declarar la función global de Firma Perú
declare global {
  interface Window {
    startSignature?: (port: number, params: string) => void
  }
}

interface Tesista {
  id: string
  tipoParticipante: string
  orden: number
  codigoEstudiante: string
  carrera: string
  user: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    email: string
  }
}

interface Asesor {
  id: string
  tipoAsesor: string
  estado: string
  fechaRespuesta: string | null
  esMiRegistro: boolean
  user: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    email: string
  }
}

interface Documento {
  id: string
  tipoDocumento: string
  nombre: string
  descripcion: string | null
  archivoUrl: string
  archivoNombre: string
  archivoTamano: number
  version: number
  firmadoDigitalmente: boolean
  createdAt: string
}

interface AsesoriaDetalle {
  asesoria: {
    id: string
    tipoAsesor: string
    estado: string
    fechaRespuesta: string | null
    motivoRechazo: string | null
  }
  tesis: {
    id: string
    codigo: string
    titulo: string
    resumen: string | null
    palabrasClave: string[]
    lineaInvestigacion: string | null
    estado: string
    carreraNombre: string
    fechaRegistro: string | null
    createdAt: string
    facultad: {
      id: string
      nombre: string
    }
  }
  tesistas: Tesista[]
  asesores: Asesor[]
  documentos: Documento[]
  historial: {
    id: string
    estadoAnterior: string
    estadoNuevo: string
    comentario: string | null
    fecha: string
    realizadoPor: string | null
  }[]
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  EN_REVISION: { label: 'En Revision', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  REGISTRO_PENDIENTE: { label: 'En Revisión', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  OBSERVADA: { label: 'Observada', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  PROYECTO_OBSERVADO: { label: 'Observado', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ASIGNANDO_JURADOS: { label: 'Asignando Jurados', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  EN_EVALUACION_JURADO: { label: 'En Evaluacion', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  OBSERVADA_JURADO: { label: 'Observada por Jurado', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  PROYECTO_APROBADO: { label: 'Proyecto Aprobado', color: 'text-green-600', bgColor: 'bg-green-100' },
  INFORME_FINAL: { label: 'Informe Final', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  EN_REVISION_INFORME: { label: 'Informe en Revisión', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  EN_EVALUACION_INFORME: { label: 'Evaluando Informe', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  OBSERVADA_INFORME: { label: 'Informe Observado', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  APROBADA: { label: 'Aprobada', color: 'text-green-600', bgColor: 'bg-green-100' },
  EN_SUSTENTACION: { label: 'En Sustentacion', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  RECHAZADA: { label: 'Rechazada', color: 'text-red-600', bgColor: 'bg-red-100' },
  EN_DESARROLLO: { label: 'En Desarrollo', color: 'text-blue-600', bgColor: 'bg-blue-100' },
}

export default function DetalleAsesoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<AsesoriaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [subiendoCarta, setSubiendoCarta] = useState(false)
  const [cartaSubida, setCartaSubida] = useState<{
    fileName: string
    filePath: string
  } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [procesandoFirma, setProcesandoFirma] = useState(false)
  const [errorFirma, setErrorFirma] = useState<string | null>(null)

  // Estado para registrar carta sin firma digital
  const [registrandoCarta, setRegistrandoCarta] = useState(false)

  // Estados para aceptar/rechazar
  const [showRespuestaDialog, setShowRespuestaDialog] = useState(false)
  const [accionRespuesta, setAccionRespuesta] = useState<'ACEPTAR' | 'RECHAZAR' | null>(null)
  const [procesandoRespuesta, setProcesandoRespuesta] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
    }
  }, [authLoading, user, id])

  // Escuchar eventos de Firma Perú
  useEffect(() => {
    const handleFirmaSuccess = async () => {
      toast.success('Carta firmada correctamente')
      setProcesandoFirma(false)
      setCartaSubida(null)
      await loadData()
    }

    const handleFirmaCancel = () => {
      toast.info('Proceso de firma cancelado')
      setProcesandoFirma(false)
    }

    const handleFirmaError = (e: CustomEvent) => {
      toast.error(`Error en firma: ${e.detail}`)
      setProcesandoFirma(false)
    }

    window.addEventListener('firma-peru-success', handleFirmaSuccess)
    window.addEventListener('firma-peru-cancel', handleFirmaCancel)
    window.addEventListener('firma-peru-error', handleFirmaError as EventListener)

    return () => {
      window.removeEventListener('firma-peru-success', handleFirmaSuccess)
      window.removeEventListener('firma-peru-cancel', handleFirmaCancel)
      window.removeEventListener('firma-peru-error', handleFirmaError as EventListener)
    }
  }, [])

  const loadData = async () => {
    try {
      const result = await api.get<{ data: AsesoriaDetalle }>(`/api/mis-asesorias/${id}`)
      setData(result.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar datos')
      router.push('/mis-asesorias')
    } finally {
      setLoading(false)
    }
  }

  // Manejar aceptar/rechazar asesoría
  const handleResponder = (accion: 'ACEPTAR' | 'RECHAZAR') => {
    setAccionRespuesta(accion)
    setShowRespuestaDialog(true)
  }

  const confirmarRespuesta = async () => {
    if (!data || !accionRespuesta) return

    setProcesandoRespuesta(true)

    try {
      const result = await api.post<{ message: string }>(`/api/mis-invitaciones/${data.asesoria.id}/responder`, { accion: accionRespuesta })
      toast.success(result.message)
      setShowRespuestaDialog(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar respuesta')
    } finally {
      setProcesandoRespuesta(false)
    }
  }

  // Registrar carta sin firma digital (ya viene firmada físicamente)
  const registrarCartaSinFirma = async () => {
    if (!cartaSubida || !data) return

    setRegistrandoCarta(true)

    try {
      await api.post(`/api/tesis/${data.tesis.id}/carta-aceptacion/registrar`, { fileName: cartaSubida.fileName })
      toast.success('Carta de aceptación registrada correctamente')
      setCartaSubida(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar carta')
    } finally {
      setRegistrandoCarta(false)
    }
  }

  // Subir carta de aceptación (PDF)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !data) return

    // Validar que sea PDF
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar los 10MB')
      return
    }

    setSubiendoCarta(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await api.post<{ data: { fileName: string; filePath: string } }>(`/api/tesis/${data.tesis.id}/carta-aceptacion/subir`, formData)
      setCartaSubida({
        fileName: result.data.fileName,
        filePath: result.data.filePath,
      })
      toast.success('Carta subida correctamente. Ahora puedes firmarla.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir carta')
    } finally {
      setSubiendoCarta(false)
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Cargar script de Firma Perú
  const loadFirmaPeruScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.startSignature) {
        resolve()
        return
      }

      if (document.getElementById('firma-peru-client')) {
        const checkLoaded = setInterval(() => {
          if (window.startSignature) {
            clearInterval(checkLoaded)
            resolve()
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkLoaded)
          if (window.startSignature) resolve()
          else reject(new Error('Timeout cargando Firma Perú'))
        }, 10000)
        return
      }

      const script = document.createElement('script')
      script.id = 'firma-peru-client'
      script.src = 'https://apps.firmaperu.gob.pe/web/clienteweb/firmaperu.min.js'
      script.async = true
      script.onload = () => {
        setTimeout(() => {
          if (window.startSignature) resolve()
          else reject(new Error('Script cargado pero startSignature no disponible'))
        }, 500)
      }
      script.onerror = () => reject(new Error('Error al cargar script de Firma Perú'))
      document.body.appendChild(script)
    })
  }

  const iniciarFirma = async () => {
    if (!cartaSubida || !data) return

    setProcesandoFirma(true)
    setShowConfirmDialog(false)
    setErrorFirma(null)

    try {
      // Cargar script de Firma Perú
      await loadFirmaPeruScript()

      if (!window.startSignature) {
        throw new Error('El cliente de Firma Perú no está disponible')
      }

      // Registrar el lote con metadata de tesis
      const result = await api.post<{ data: { token_lote: string } }>(`/api/tesis/${data.tesis.id}/carta-aceptacion/firmar`, {
        fileName: cartaSubida.fileName,
        motivo: 1, // Autor
        apariencia: 1, // Horizontal
      })

      const { token_lote } = result.data

      // Construir URL para el cliente de Firma Perú
      const baseUrl = window.location.origin
      const argumentosUrl = `${baseUrl}/api/firma-peru/argumentos?token_lote=${token_lote}`

      // Crear parámetros para Firma Perú
      const firmaParams: FirmaPeruParams = {
        param_url: argumentosUrl,
        param_token: FIRMA_PERU_STATIC_TOKEN,
        document_extension: 'pdf',
      }

      // Convertir a Base64
      const paramsString = JSON.stringify(firmaParams)
      const base64Params = btoa(paramsString)

      console.log('[Firma Perú] Iniciando firma con token:', token_lote)
      window.startSignature(FIRMA_PERU_PORT, base64Params)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al iniciar la firma'
      setErrorFirma(errorMsg)
      toast.error(errorMsg)
      setProcesandoFirma(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No encontrado</h2>
            <p className="text-muted-foreground mb-4">
              La asesoría que buscas no existe o no tienes acceso.
            </p>
            <Button asChild>
              <Link href="/mis-asesorias">Volver</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const estadoConfig = ESTADO_CONFIG[data.tesis.estado] || ESTADO_CONFIG.BORRADOR
  const miAsesoria = data.asesoria
  const tipoAsesorTexto = miAsesoria.tipoAsesor === 'ASESOR' ? 'Asesor' : 'Coasesor'
  const docProyecto = data.documentos.find((d) => d.tipoDocumento === 'PROYECTO')
  const docCartaAsesor = data.documentos.find((d) => d.tipoDocumento === 'CARTA_ACEPTACION_ASESOR')
  const docCartaCoasesor = data.documentos.find(
    (d) => d.tipoDocumento === 'CARTA_ACEPTACION_COASESOR'
  )

  // Verificar si ya tengo mi carta firmada
  const miCartaFirmada =
    miAsesoria.tipoAsesor === 'ASESOR' ? docCartaAsesor : docCartaCoasesor

  // Documentos adicionales
  const docVoucher = data.documentos.find((d) => d.tipoDocumento === 'VOUCHER_PAGO')
  const docsSustentatorios = data.documentos.filter((d) => d.tipoDocumento === 'DOCUMENTO_SUSTENTATORIO')
  const docInformeFinal = data.documentos.find((d) => d.tipoDocumento === 'INFORME_FINAL_DOC')
  const docVoucherInforme = data.documentos.find((d) => d.tipoDocumento === 'VOUCHER_PAGO_INFORME')
  const docResolucionJurado = data.documentos.find((d) => d.tipoDocumento === 'RESOLUCION_JURADO')
  const docResolucionAprobacion = data.documentos.find((d) => d.tipoDocumento === 'RESOLUCION_APROBACION')
  const docResolucionSustentacion = data.documentos.find((d) => d.tipoDocumento === 'RESOLUCION_SUSTENTACION')
  const docReporteTurnitin = data.documentos.find((d) => d.tipoDocumento === 'REPORTE_TURNITIN')
  const docActaVerificacion = data.documentos.find((d) => d.tipoDocumento === 'ACTA_VERIFICACION_ASESOR')

  // Jurados
  const juradosProyecto = ((data as any).jurados || []).filter((j: any) => j.fase === 'PROYECTO')
  const juradosInforme = ((data as any).jurados || []).filter((j: any) => j.fase === 'INFORME_FINAL')

  // Timeline del progreso
  const FASES_TIMELINE = [
    { key: 'BORRADOR', label: 'Registro', estados: ['BORRADOR'] },
    { key: 'EN_REVISION', label: 'Revisión', estados: ['EN_REVISION', 'OBSERVADA'] },
    { key: 'JURADOS', label: 'Jurados', estados: ['ASIGNANDO_JURADOS', 'EN_EVALUACION_JURADO', 'OBSERVADA_JURADO'] },
    { key: 'APROBADO', label: 'Aprobado', estados: ['PROYECTO_APROBADO'] },
    { key: 'INFORME', label: 'Informe Final', estados: ['INFORME_FINAL', 'EN_REVISION_INFORME', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME'] },
    { key: 'SUSTENTACION', label: 'Sustentación', estados: ['APROBADA', 'EN_SUSTENTACION', 'SUSTENTADA'] },
  ]
  const faseActualIndex = FASES_TIMELINE.findIndex(f => f.estados.includes(data.tesis.estado))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/mis-asesorias" className="hover:text-foreground transition-colors">
          Mis Asesorías
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {data.tesis.codigo}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Button variant="outline" size="icon" asChild className="flex-shrink-0">
          <Link href="/mis-asesorias">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className="font-mono">
              {data.tesis.codigo}
            </Badge>
            <Badge className={cn(estadoConfig.bgColor, estadoConfig.color, 'gap-1')}>
              {estadoConfig.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                miAsesoria.tipoAsesor === 'ASESOR'
                  ? 'border-green-500 text-green-600'
                  : 'border-purple-500 text-purple-600'
              )}
            >
              {tipoAsesorTexto}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold leading-tight">{data.tesis.titulo}</h1>
          <p className="text-muted-foreground mt-1">
            {data.tesis.carreraNombre} • {data.tesis.facultad.nombre}
          </p>
        </div>
      </div>

      {/* Estado de aceptación - PENDIENTE */}
      {miAsesoria.estado === 'PENDIENTE' && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    Solicitud de Asesoría Pendiente
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Un estudiante te ha propuesto como {tipoAsesorTexto.toLowerCase()} de esta tesis.
                    Revisa el proyecto y decide si aceptas.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:flex-shrink-0">
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleResponder('RECHAZAR')}
                >
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleResponder('ACEPTAR')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aceptar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado de aceptación - ACEPTADO sin carta firmada */}
      {miAsesoria.estado === 'ACEPTADO' && !miCartaFirmada && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <FileSignature className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-200">
                  Falta Subir Carta de Aceptación
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Has aceptado ser {tipoAsesorTexto.toLowerCase()}. Ahora sube tu carta de
                  aceptación para completar el proceso. Puedes firmarla digitalmente o subir una carta ya firmada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observación de mesa de partes */}
      {data.tesis.estado === 'OBSERVADA' && (() => {
        const observacion = data.historial?.find(
          (h: any) => h.estadoNuevo === 'OBSERVADA'
        )
        return (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-orange-800 dark:text-orange-200">Proyecto Observado por Mesa de Partes</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      El proyecto de tu asesorado tiene observaciones. El tesista debe realizar las correcciones y reenviar.
                    </p>
                  </div>
                  {observacion?.comentario && (
                    <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800">
                      <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1.5">
                        Observaciones
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{observacion.comentario}</p>
                      {observacion.realizadoPor && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Por: {observacion.realizadoPor}
                          {observacion.fecha && ` — ${new Date(observacion.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
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

      {/* Timeline horizontal de progreso */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between overflow-x-auto gap-1">
            {FASES_TIMELINE.map((fase, i) => {
              const esActual = i === faseActualIndex
              const completada = i < faseActualIndex
              return (
                <div key={fase.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                      completada && 'bg-green-500 border-green-500',
                      esActual && 'bg-primary border-primary ring-4 ring-primary/20',
                      !completada && !esActual && 'bg-muted border-muted-foreground/20'
                    )}>
                      {completada ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : esActual ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    <span className={cn(
                      'text-[10px] sm:text-xs font-medium text-center whitespace-nowrap',
                      esActual && 'text-primary',
                      completada && 'text-green-600',
                      !completada && !esActual && 'text-muted-foreground'
                    )}>
                      {fase.label}
                    </span>
                  </div>
                  {i < FASES_TIMELINE.length - 1 && (
                    <div className={cn('h-0.5 flex-1 mx-1 sm:mx-2 rounded-full min-w-[16px]', completada ? 'bg-green-500' : 'bg-border')} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subir y firmar carta (solo si aceptado pero sin carta firmada) */}
          {miAsesoria.estado === 'ACEPTADO' && !miCartaFirmada && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileSignature className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Carta de Aceptación</CardTitle>
                    <CardDescription>
                      Sube tu carta de aceptación en PDF. Puedes firmarla digitalmente o subir una carta ya firmada.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subir carta */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Upload className="w-5 h-5 text-primary" />
                    <p className="font-medium">Subir Carta de Aceptación</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Sube tu carta de aceptación en formato PDF (máx. 10MB)
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={subiendoCarta}
                  />

                  {cartaSubida ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300 truncate">
                          {cartaSubida.fileName}
                        </p>
                        <p className="text-xs text-green-600">Carta subida correctamente</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={subiendoCarta || procesandoFirma || registrandoCarta}
                      >
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={subiendoCarta}
                    >
                      {subiendoCarta ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Seleccionar PDF
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Opciones después de subir: Registrar directamente o Firmar con Firma Perú */}
                {cartaSubida && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Opción 1: Registrar directamente (ya firmada) */}
                    <div className="p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FileCheck className="w-5 h-5 text-green-600" />
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Carta ya firmada
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Si tu carta ya está firmada (firma manuscrita o escaneada), regístrala directamente.
                      </p>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={registrarCartaSinFirma}
                        disabled={registrandoCarta || procesandoFirma}
                      >
                        {registrandoCarta ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Registrar Carta
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Opción 2: Firmar digitalmente */}
                    <div className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <PenTool className="w-5 h-5 text-purple-600" />
                        <p className="font-medium text-purple-800 dark:text-purple-200">
                          Firma Digital
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Firma digitalmente con Firma Perú usando tu certificado digital (DNIe).
                      </p>
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => setShowConfirmDialog(true)}
                        disabled={procesandoFirma || registrandoCarta}
                      >
                        {procesandoFirma ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <PenTool className="w-4 h-4 mr-2" />
                            Firmar con Firma Perú
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {errorFirma && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {errorFirma}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Carta firmada (si existe) */}
          {miCartaFirmada && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Carta de Aceptación Registrada</CardTitle>
                    <CardDescription>Tu carta de aceptación está registrada en el sistema</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-green-600" />
                    <div>
                      <a href={miCartaFirmada.archivoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline cursor-pointer">{miCartaFirmada.nombre}</a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(miCartaFirmada.archivoTamano)} • {new Date(miCartaFirmada.createdAt).toLocaleDateString('es-PE')}
                        </p>
                        {miCartaFirmada.firmadoDigitalmente ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500 text-purple-600">
                            <PenTool className="w-2.5 h-2.5 mr-1" />
                            Firma Digital
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                            <FileCheck className="w-2.5 h-2.5 mr-1" />
                            Firma Física
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={miCartaFirmada.archivoUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalles del proyecto */}
          {(data.tesis.resumen || data.tesis.palabrasClave.length > 0 || data.tesis.lineaInvestigacion) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles del Proyecto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.tesis.lineaInvestigacion && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Línea de Investigación
                    </p>
                    <p className="text-sm">{data.tesis.lineaInvestigacion}</p>
                  </div>
                )}
                {data.tesis.resumen && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Resumen
                    </p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {data.tesis.resumen}
                    </p>
                  </div>
                )}
                {data.tesis.palabrasClave.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Palabras Clave
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.tesis.palabrasClave.map((p, i) => (
                        <Badge key={i} variant="secondary">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tesistas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Tesistas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.tesistas.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    t.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'bg-primary/10' : 'bg-blue-100 dark:bg-blue-900/50'
                  )}>
                    <User className={cn('w-4 h-4', t.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'text-primary' : 'text-blue-600')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.user.apellidoPaterno} {t.user.apellidoMaterno}, {t.user.nombres}</p>
                    <p className="text-xs text-muted-foreground">{t.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'Tesista 1' : 'Tesista 2'} • {t.codigoEstudiante}</p>
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
              {data.asesores.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    a.tipoAsesor === 'ASESOR' ? 'bg-green-100 dark:bg-green-900/50' : 'bg-purple-100 dark:bg-purple-900/50'
                  )}>
                    <GraduationCap className={cn('w-4 h-4', a.tipoAsesor === 'ASESOR' ? 'text-green-600' : 'text-purple-600')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {a.user.apellidoPaterno} {a.user.apellidoMaterno}, {a.user.nombres}
                      {a.esMiRegistro && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">Tú</Badge>}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{a.tipoAsesor === 'ASESOR' ? 'Asesor' : 'Coasesor'}</span>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0',
                        a.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                        a.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                        a.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
                      )}>
                        {a.estado === 'PENDIENTE' ? 'Pendiente' : a.estado === 'ACEPTADO' ? 'Aceptado' : 'Rechazado'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Jurados (si existen) */}
          {juradosProyecto.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-primary" />
                  Jurados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {juradosProyecto.map((j: any) => (
                  <div key={j.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                      <Gavel className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{j.nombre}</p>
                      <p className="text-xs text-muted-foreground">{j.tipo}</p>
                    </div>
                    {j.evaluaciones?.[0] && (
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0',
                        j.evaluaciones[0].resultado === 'APROBADO' ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'
                      )}>
                        {j.evaluaciones[0].resultado === 'APROBADO' ? 'Aprobó' : 'Observó'}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tabs de información detallada */}
      <Tabs defaultValue="documentos" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="documentos" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="observaciones" className="gap-1.5 text-xs sm:text-sm">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            Observaciones
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Documentos */}
        <TabsContent value="documentos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                Documentos de la Tesis
              </CardTitle>
              <CardDescription>Todos los documentos presentados en el expediente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Proyecto de Tesis', doc: docProyecto, icon: <FileText className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/50' },
                { label: 'Carta de Aceptación del Asesor', doc: docCartaAsesor, icon: <GraduationCap className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/50' },
                ...(docCartaCoasesor ? [{ label: 'Carta de Aceptación del Coasesor', doc: docCartaCoasesor, icon: <Users className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/50' }] : []),
                { label: 'Voucher de Pago', doc: docVoucher, icon: <Receipt className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/50' },
                ...docsSustentatorios.map((d, i) => ({ label: `Documento Sustentatorio ${docsSustentatorios.length > 1 ? `(${i + 1})` : ''}`, doc: d, icon: <File className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/50' })),
                ...(docReporteTurnitin ? [{ label: 'Reporte Turnitin', doc: docReporteTurnitin, icon: <FileCheck className="w-4 h-4" />, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/50' }] : []),
                ...(docActaVerificacion ? [{ label: 'Acta de Verificación del Asesor', doc: docActaVerificacion, icon: <FileSignature className="w-4 h-4" />, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/50' }] : []),
                ...(docResolucionJurado ? [{ label: 'Resolución de Conformación de Jurado', doc: docResolucionJurado, icon: <Gavel className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/50' }] : []),
                ...(docResolucionAprobacion ? [{ label: 'Resolución de Aprobación', doc: docResolucionAprobacion, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/50' }] : []),
                ...(docInformeFinal ? [{ label: 'Informe Final de Tesis', doc: docInformeFinal, icon: <FileText className="w-4 h-4" />, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/50' }] : []),
                ...(docVoucherInforme ? [{ label: 'Voucher de Pago - Informe Final', doc: docVoucherInforme, icon: <Receipt className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/50' }] : []),
                ...(docResolucionSustentacion ? [{ label: 'Resolución de Sustentación', doc: docResolucionSustentacion, icon: <GraduationCap className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/50' }] : []),
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', item.bg)}>
                    <span className={item.color}>{item.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.doc ? (
                      <p className="text-xs text-muted-foreground">{new Date(item.doc.createdAt).toLocaleDateString('es-PE')} • {formatFileSize(item.doc.archivoTamano)}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No presentado</p>
                    )}
                  </div>
                  {item.doc ? (
                    <a href={item.doc.archivoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded-md hover:bg-primary/5 shrink-0">
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </a>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Pendiente</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Observaciones */}
        <TabsContent value="observaciones" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                Observaciones
              </CardTitle>
              <CardDescription>Observaciones realizadas durante el proceso</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const observaciones = data.historial.filter(h =>
                  ['OBSERVADA', 'OBSERVADA_JURADO', 'OBSERVADA_INFORME', 'RECHAZADA'].includes(h.estadoNuevo) && h.comentario
                )
                if (observaciones.length === 0) {
                  return (
                    <div className="py-8 text-center">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-green-500/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No hay observaciones registradas</p>
                    </div>
                  )
                }
                return (
                  <div className="space-y-3">
                    {observaciones.map((obs) => {
                      const config = ESTADO_CONFIG[obs.estadoNuevo]
                      return (
                        <div key={obs.id} className="rounded-lg border p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={cn(config?.bgColor, config?.color, 'text-[11px]')}>{config?.label || obs.estadoNuevo}</Badge>
                            <span className="text-[11px] text-muted-foreground">{new Date(obs.fecha).toLocaleString('es-PE')}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{obs.comentario}</p>
                          {obs.realizadoPor && <p className="text-xs text-muted-foreground mt-2">Por: {obs.realizadoPor}</p>}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary shrink-0" />
                Historial Completo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.historial.length > 0 ? (
                <div className="space-y-4">
                  {data.historial.map((item, index) => {
                    const config = ESTADO_CONFIG[item.estadoNuevo]
                    return (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', config?.bgColor || 'bg-gray-100')}>
                            <Clock className="w-4 h-4" />
                          </div>
                          {index < data.historial.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-4">
                          <p className="font-medium text-sm">{config?.label || item.estadoNuevo}</p>
                          <p className="text-[11px] text-muted-foreground">{new Date(item.fecha).toLocaleString('es-PE')}</p>
                          {item.comentario && <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-2 rounded-lg whitespace-pre-wrap">{item.comentario}</p>}
                          {item.realizadoPor && <p className="text-[11px] text-muted-foreground mt-1">Por: {item.realizadoPor}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <History className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No hay registros</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación de firma */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <PenTool className="w-7 h-7 text-white" />
            </div>
            <DialogTitle className="text-xl">Firma Digital con Firma Perú</DialogTitle>
            <DialogDescription>
              Vas a firmar digitalmente tu carta de aceptación como {tipoAsesorTexto.toLowerCase()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 overflow-hidden">
            {/* Documento a firmar */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-3 overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documento a firmar</p>
              {cartaSubida && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-gray-900 border overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium truncate">{cartaSubida.fileName}</p>
                    <p className="text-xs text-muted-foreground">Carta de Aceptación - {tipoAsesorTexto}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Código</p>
                  <p className="font-mono font-medium">{data.tesis.codigo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rol</p>
                  <p className="font-medium">{tipoAsesorTexto}</p>
                </div>
              </div>
              <div className="text-sm overflow-hidden">
                <p className="text-xs text-muted-foreground">Tesis</p>
                <p className="font-medium line-clamp-2">{data.tesis.titulo}</p>
              </div>
            </div>

            {/* Requisitos */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">Requisitos previos</p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Cliente de <strong>Firma Perú</strong> instalado y en ejecución</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Certificado digital <strong>(DNIe)</strong> conectado al equipo</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>PIN del certificado digital disponible</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={iniciarFirma} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20">
              <PenTool className="w-4 h-4 mr-2" />
              Firmar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de aceptar/rechazar */}
      <Dialog open={showRespuestaDialog} onOpenChange={setShowRespuestaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionRespuesta === 'ACEPTAR' ? 'Aceptar Asesoría' : 'Rechazar Asesoría'}
            </DialogTitle>
            <DialogDescription>
              {accionRespuesta === 'ACEPTAR'
                ? `¿Estás seguro de que deseas ser ${tipoAsesorTexto.toLowerCase()} de este proyecto de tesis?`
                : `¿Estás seguro de que deseas rechazar ser ${tipoAsesorTexto.toLowerCase()} de este proyecto?`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="font-medium line-clamp-2">{data.tesis.titulo}</p>
              <p className="text-sm text-muted-foreground">
                Código: {data.tesis.codigo}
              </p>
              <p className="text-sm text-muted-foreground">
                {data.tesistas.length > 1 ? 'Tesistas: ' : 'Tesista: '}
                {data.tesistas
                  .map((t) => `${t.user.nombres} ${t.user.apellidoPaterno}`)
                  .join(' & ')}
              </p>
            </div>

            {accionRespuesta === 'ACEPTAR' && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  Al aceptar, deberás subir y firmar tu carta de aceptación.
                </p>
              </div>
            )}

            {accionRespuesta === 'RECHAZAR' && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  El estudiante deberá buscar otro {tipoAsesorTexto.toLowerCase()}.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRespuestaDialog(false)}
              disabled={procesandoRespuesta}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarRespuesta}
              disabled={procesandoRespuesta}
              className={cn(
                accionRespuesta === 'ACEPTAR' && 'bg-green-600 hover:bg-green-700',
                accionRespuesta === 'RECHAZAR' && 'bg-red-600 hover:bg-red-700'
              )}
            >
              {procesandoRespuesta ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : accionRespuesta === 'ACEPTAR' ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              {procesandoRespuesta
                ? 'Procesando...'
                : accionRespuesta === 'ACEPTAR'
                  ? 'Aceptar'
                  : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
