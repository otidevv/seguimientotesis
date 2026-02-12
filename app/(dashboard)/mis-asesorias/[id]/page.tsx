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
  GraduationCap,
  Loader2,
  PenTool,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  REGISTRO_PENDIENTE: { label: 'En Revisión', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  PROYECTO_OBSERVADO: { label: 'Observado', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  PROYECTO_APROBADO: { label: 'Aprobado', color: 'text-green-600', bgColor: 'bg-green-100' },
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
      const response = await fetch(`/api/mis-asesorias/${id}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        toast.error(result.error || 'Error al cargar datos')
        router.push('/mis-asesorias')
      }
    } catch {
      toast.error('Error de conexión')
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
      const response = await fetch(`/api/mis-invitaciones/${data.asesoria.id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: accionRespuesta }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        setShowRespuestaDialog(false)
        await loadData()
      } else {
        toast.error(result.error || 'Error al procesar respuesta')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setProcesandoRespuesta(false)
    }
  }

  // Registrar carta sin firma digital (ya viene firmada físicamente)
  const registrarCartaSinFirma = async () => {
    if (!cartaSubida || !data) return

    setRegistrandoCarta(true)

    try {
      const response = await fetch(`/api/tesis/${data.tesis.id}/carta-aceptacion/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: cartaSubida.fileName }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Carta de aceptación registrada correctamente')
        setCartaSubida(null)
        await loadData()
      } else {
        toast.error(result.error || 'Error al registrar carta')
      }
    } catch {
      toast.error('Error de conexión')
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

      const response = await fetch(`/api/tesis/${data.tesis.id}/carta-aceptacion/subir`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setCartaSubida({
          fileName: result.data.fileName,
          filePath: result.data.filePath,
        })
        toast.success('Carta subida correctamente. Ahora puedes firmarla.')
      } else {
        toast.error(result.error || 'Error al subir carta')
      }
    } catch {
      toast.error('Error de conexión')
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
      const response = await fetch(`/api/tesis/${data.tesis.id}/carta-aceptacion/firmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: cartaSubida.fileName,
          motivo: 1, // Autor
          apariencia: 1, // Horizontal
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al iniciar firma')
      }

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

      {/* Estado de aceptación - ACEPTADO con carta firmada */}
      {miAsesoria.estado === 'ACEPTADO' && miCartaFirmada && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">Asesoría Confirmada</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Has aceptado ser {tipoAsesorTexto.toLowerCase()} de esta tesis. Tu carta de
                  aceptación está registrada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                      <p className="font-medium text-sm">{miCartaFirmada.nombre}</p>
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
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      t.tipoParticipante === 'AUTOR_PRINCIPAL'
                        ? 'bg-primary/10'
                        : 'bg-blue-100 dark:bg-blue-900/50'
                    )}
                  >
                    <User
                      className={cn(
                        'w-4 h-4',
                        t.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'text-primary' : 'text-blue-600'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {t.user.apellidoPaterno} {t.user.apellidoMaterno}, {t.user.nombres}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'Tesista 1' : 'Tesista 2'} •{' '}
                      {t.codigoEstudiante}
                    </p>
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
                Equipo de Asesores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.asesores.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      a.tipoAsesor === 'ASESOR'
                        ? 'bg-green-100 dark:bg-green-900/50'
                        : 'bg-purple-100 dark:bg-purple-900/50'
                    )}
                  >
                    <GraduationCap
                      className={cn(
                        'w-4 h-4',
                        a.tipoAsesor === 'ASESOR' ? 'text-green-600' : 'text-purple-600'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {a.user.apellidoPaterno} {a.user.apellidoMaterno}, {a.user.nombres}
                      {a.esMiRegistro && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                          Tú
                        </Badge>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {a.tipoAsesor === 'ASESOR' ? 'Asesor' : 'Coasesor'}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          a.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                          a.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                          a.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
                        )}
                      >
                        {a.estado === 'PENDIENTE'
                          ? 'Pendiente'
                          : a.estado === 'ACEPTADO'
                            ? 'Aceptado'
                            : 'Rechazado'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.documentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin documentos</p>
              ) : (
                data.documentos.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{d.nombre}</span>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={d.archivoUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de confirmación de firma */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Firma Digital</DialogTitle>
            <DialogDescription>
              Estás a punto de firmar tu carta de aceptación con Firma Perú. Asegúrate de tener
              instalado el cliente de Firma Perú y tu certificado digital.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm">
              <strong>Tesis:</strong> {data.tesis.titulo}
            </p>
            <p className="text-sm">
              <strong>Código:</strong> {data.tesis.codigo}
            </p>
            <p className="text-sm">
              <strong>Rol:</strong> {tipoAsesorTexto}
            </p>
            {cartaSubida && (
              <p className="text-sm">
                <strong>Archivo:</strong> {cartaSubida.fileName}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={iniciarFirma} className="bg-purple-600 hover:bg-purple-700">
              <PenTool className="w-4 h-4 mr-2" />
              Confirmar y Firmar
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
