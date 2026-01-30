'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
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
  Download,
  Eye,
  File,
  FileCheck,
  FileText,
  FileUp,
  GraduationCap,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Documento {
  id: string
  tipoDocumento: string
  nombre: string
  archivoUrl: string
  archivoTamano: number
  archivoMimeType: string
  createdAt: string
}

interface Tesis {
  id: string
  codigo: string
  titulo: string
  resumen: string | null
  palabrasClave: string[]
  lineaInvestigacion: string | null
  carreraNombre: string
  estado: string
  createdAt: string
  fechaRegistro: string | null
  autores: {
    id: string
    tipoParticipante: string
    estado: string // PENDIENTE, ACEPTADO, RECHAZADO
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
    studentCareer: {
      codigoEstudiante: string
    }
  }[]
  asesores: {
    id: string
    tipoAsesor: string
    estado: string
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
  }[]
  facultad: {
    id: string
    nombre: string
  }
  documentos: Documento[]
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  BORRADOR: {
    label: 'Borrador',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: <FileText className="w-4 h-4" />
  },
  EN_REVISION: {
    label: 'En Revisión',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  REGISTRO_PENDIENTE: {
    label: 'En Revisión',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  OBSERVADA: {
    label: 'Observada',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />
  },
  PROYECTO_OBSERVADO: {
    label: 'Observado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />
  },
  APROBADA: {
    label: 'Aprobada',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  PROYECTO_APROBADO: {
    label: 'Proyecto Aprobado',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  EN_DESARROLLO: {
    label: 'En Desarrollo',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <FileText className="w-4 h-4" />
  },
  EN_SUSTENTACION: {
    label: 'En Sustentación',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <GraduationCap className="w-4 h-4" />
  },
  SUSTENTADA: {
    label: 'Sustentada',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  RECHAZADA: {
    label: 'Rechazada',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-4 h-4" />
  },
}

const ESTADO_ASESOR_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDIENTE: {
    label: 'Pendiente de aceptación',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className="w-5 h-5" />
  },
  ACEPTADO: {
    label: 'Carta firmada',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="w-5 h-5" />
  },
  RECHAZADO: {
    label: 'Rechazado',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-5 h-5" />
  },
}

interface Participante {
  id: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string
  codigoEstudiante?: string
  codigoDocente?: string
  carrera?: string
  departamento?: string
  studentCareerId?: string // ID del registro StudentCareer específico
}

export default function DetalleTesisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [tesis, setTesis] = useState<Tesis | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [subiendo, setSubiendo] = useState<string | null>(null)

  // Estado para el diálogo de reemplazo/agregar participantes
  const [dialogReemplazo, setDialogReemplazo] = useState(false)
  const [tipoReemplazo, setTipoReemplazo] = useState<'COAUTOR' | 'ASESOR' | 'COASESOR' | null>(null)
  const [participanteActualId, setParticipanteActualId] = useState<string | null>(null)
  const [modoDialogo, setModoDialogo] = useState<'REEMPLAZAR' | 'AGREGAR'>('REEMPLAZAR')
  const [busquedaParticipante, setBusquedaParticipante] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Participante[]>([])
  const [buscando, setBuscando] = useState(false)
  const [reemplazando, setReemplazando] = useState(false)
  const [participanteSeleccionado, setParticipanteSeleccionado] = useState<Participante | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      loadTesis()
    }
  }, [authLoading, user, id])

  const loadTesis = async () => {
    try {
      const response = await fetch(`/api/tesis/${id}`)
      const data = await response.json()

      if (data.success) {
        setTesis(data.data)
      } else {
        toast.error(data.error || 'Tesis no encontrada')
        router.push('/mis-tesis')
      }
    } catch {
      toast.error('Error al cargar tesis')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (tipoDocumento: string, file: File) => {
    if (!tesis) return

    setSubiendo(tipoDocumento)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tipoDocumento', tipoDocumento)

    try {
      const response = await fetch(`/api/tesis/${tesis.id}/documentos`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Documento subido exitosamente')
        loadTesis()
      } else {
        toast.error(data.error || 'Error al subir documento')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSubiendo(null)
    }
  }

  const enviarARevision = async () => {
    if (!tesis) return

    setEnviando(true)
    try {
      const response = await fetch(`/api/tesis/${tesis.id}/enviar`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Proyecto enviado a revisión')
        loadTesis()
      } else {
        if (data.detalles) {
          data.detalles.forEach((d: string) => toast.error(d))
        } else {
          toast.error(data.error || 'Error al enviar')
        }
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setEnviando(false)
    }
  }

  // Funciones para reemplazar/agregar participantes
  const abrirDialogoReemplazo = (tipo: 'COAUTOR' | 'ASESOR' | 'COASESOR', participanteId: string) => {
    setTipoReemplazo(tipo)
    setParticipanteActualId(participanteId)
    setModoDialogo('REEMPLAZAR')
    setBusquedaParticipante('')
    setResultadosBusqueda([])
    setParticipanteSeleccionado(null)
    setDialogReemplazo(true)
  }

  const abrirDialogoAgregar = (tipo: 'COAUTOR' | 'COASESOR') => {
    setTipoReemplazo(tipo)
    setParticipanteActualId(null)
    setModoDialogo('AGREGAR')
    setBusquedaParticipante('')
    setResultadosBusqueda([])
    setParticipanteSeleccionado(null)
    setDialogReemplazo(true)
  }

  const buscarParticipantes = async (query: string) => {
    if (query.length < 2) {
      setResultadosBusqueda([])
      return
    }

    setBuscando(true)
    try {
      let endpoint: string
      if (tipoReemplazo === 'COAUTOR') {
        // Filtrar por la misma carrera del autor principal
        const carreraParam = tesis?.carreraNombre ? `&carrera=${encodeURIComponent(tesis.carreraNombre)}` : ''
        endpoint = `/api/tesis/buscar-estudiantes?q=${encodeURIComponent(query)}${carreraParam}`
      } else {
        // Para asesores, filtrar por facultad
        const facultadParam = tesis?.facultad?.id ? `&facultadId=${encodeURIComponent(tesis.facultad.id)}` : ''
        endpoint = `/api/tesis/buscar-docentes?q=${encodeURIComponent(query)}${facultadParam}`
      }

      const response = await fetch(endpoint)
      const data = await response.json()

      if (data.success) {
        setResultadosBusqueda(data.data)
      }
    } catch {
      toast.error('Error al buscar')
    } finally {
      setBuscando(false)
    }
  }

  const ejecutarReemplazo = async () => {
    if (!tesis || !tipoReemplazo || !participanteSeleccionado) return

    setReemplazando(true)
    try {
      let response: Response

      if (modoDialogo === 'AGREGAR') {
        // Agregar nuevo participante
        response = await fetch(`/api/tesis/${tesis.id}/participantes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: tipoReemplazo,
            participanteId: participanteSeleccionado.id,
            studentCareerId: tipoReemplazo === 'COAUTOR' ? participanteSeleccionado.studentCareerId : undefined,
          }),
        })
      } else {
        // Reemplazar participante existente
        response = await fetch(`/api/tesis/${tesis.id}/participantes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: tipoReemplazo,
            accion: 'REEMPLAZAR',
            participanteId: participanteActualId,
            nuevoParticipanteId: participanteSeleccionado.id,
            studentCareerId: tipoReemplazo === 'COAUTOR' ? participanteSeleccionado.studentCareerId : undefined,
          }),
        })
      }

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setDialogReemplazo(false)
        loadTesis()
      } else {
        toast.error(data.error || `Error al ${modoDialogo === 'AGREGAR' ? 'agregar' : 'reemplazar'}`)
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setReemplazando(false)
    }
  }

  const eliminarParticipante = async (tipo: 'COAUTOR' | 'COASESOR', participanteId: string) => {
    if (!tesis) return

    if (!confirm(`¿Estás seguro de eliminar este ${tipo === 'COAUTOR' ? 'coautor' : 'coasesor'}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/tesis/${tesis.id}/participantes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          accion: 'ELIMINAR',
          participanteId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        loadTesis()
      } else {
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  // Efecto para buscar cuando cambia el texto de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busquedaParticipante.length >= 2) {
        buscarParticipantes(busquedaParticipante)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaParticipante, tipoReemplazo])

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
  const puedeEditar = ['BORRADOR', 'OBSERVADA', 'PROYECTO_OBSERVADO'].includes(tesis.estado)
  const tieneCoasesor = tesis.asesores.some((a) => a.tipoAsesor === 'COASESOR')

  // Verificar si el usuario actual es el autor principal (solo él puede modificar participantes)
  const esAutorPrincipal = tesis.autores.some(
    (a) => a.tipoParticipante === 'AUTOR_PRINCIPAL' && a.user.id === user?.id
  )

  // Verificar documentos
  const docProyecto = tesis.documentos.find((d) => d.tipoDocumento === 'PROYECTO')
  const docCartaAsesor = tesis.documentos.find((d) => d.tipoDocumento === 'CARTA_ACEPTACION_ASESOR')
  const docCartaCoasesor = tesis.documentos.find((d) => d.tipoDocumento === 'CARTA_ACEPTACION_COASESOR')

  // Obtener estado de asesores
  const asesor = tesis.asesores.find((a) => a.tipoAsesor === 'ASESOR')
  const coasesor = tesis.asesores.find((a) => a.tipoAsesor === 'COASESOR')
  const asesorAcepto = asesor?.estado === 'ACEPTADO'
  const coasesorAcepto = coasesor?.estado === 'ACEPTADO'

  // Obtener estado de coautor (si existe)
  const coautor = tesis.autores.find((a) => a.tipoParticipante === 'COAUTOR')
  const coautorAcepto = coautor?.estado === 'ACEPTADO'
  const coautorRechazado = coautor?.estado === 'RECHAZADO'
  const coautorPendiente = coautor?.estado === 'PENDIENTE'

  // Calcular progreso - Proyecto + Asesores + Coautor (si existe)
  // Requisitos: 1) Proyecto, 2) Asesor firma, 3) Coasesor firma (si existe), 4) Coautor acepta (si existe)
  let requisitosRequeridos = 2 // Proyecto + Asesor
  if (tieneCoasesor) requisitosRequeridos++
  if (coautor) requisitosRequeridos++

  let requisitosCompletados = 0
  if (docProyecto) requisitosCompletados++
  if (asesorAcepto) requisitosCompletados++
  if (tieneCoasesor && coasesorAcepto) requisitosCompletados++
  if (coautor && coautorAcepto) requisitosCompletados++
  const progresoPercent = Math.round((requisitosCompletados / requisitosRequeridos) * 100)

  // Verificar si puede enviar
  const puedeEnviar = docProyecto && asesorAcepto &&
    (!tieneCoasesor || coasesorAcepto) &&
    (!coautor || coautorAcepto)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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

      {tesis.estado === 'PROYECTO_OBSERVADO' && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-orange-800 dark:text-orange-200">Proyecto observado</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Tu proyecto tiene observaciones. Revisa los comentarios y realiza las correcciones necesarias.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tesis.estado === 'EN_REVISION' && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-200">Proyecto en revisión</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Tu proyecto está siendo revisado por el comité académico. Te notificaremos cuando haya novedades.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Documentos requeridos */}
          {puedeEditar && (
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
                />

                {/* Estado de Aceptación del Asesor - El asesor sube y firma */}
                {asesor && (
                  <AdvisorStatusCard
                    titulo="Carta de Aceptación del Asesor"
                    descripcion="El asesor debe subir y firmar digitalmente su carta de aceptación"
                    tipoAsesor="Asesor"
                    asesor={asesor}
                    documento={docCartaAsesor}
                    icon={<GraduationCap className="w-5 h-5" />}
                    iconColor="text-green-600"
                    iconBg="bg-green-100 dark:bg-green-900/50"
                  />
                )}

                {/* Estado de Aceptación del Coasesor - El coasesor sube y firma */}
                {coasesor && (
                  <AdvisorStatusCard
                    titulo="Carta de Aceptación del Coasesor"
                    descripcion="El coasesor debe subir y firmar digitalmente su carta de aceptación"
                    tipoAsesor="Coasesor"
                    asesor={coasesor}
                    documento={docCartaCoasesor}
                    icon={<Users className="w-5 h-5" />}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100 dark:bg-purple-900/50"
                  />
                )}

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
                                ? 'Esperando que el asesor firme su carta de aceptación'
                                : 'Esperando que el coasesor firme su carta de aceptación'}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={enviarARevision}
                    disabled={enviando || !puedeEnviar}
                    className={cn(
                      puedeEnviar && 'bg-green-600 hover:bg-green-700'
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

          {/* Documentos y Estado (solo lectura - cuando NO puede editar) */}
          {!puedeEditar && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Documentos y Requisitos</CardTitle>
                    <CardDescription>
                      Estado actual de los documentos de tu proyecto
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Documento del Proyecto */}
                <ReadOnlyDocumentCard
                  titulo="Proyecto de Tesis"
                  documento={docProyecto}
                  icon={<FileText className="w-5 h-5" />}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-100 dark:bg-blue-900/50"
                />

                {/* Estado del Asesor */}
                {asesor && (
                  <ReadOnlyAdvisorCard
                    titulo="Asesor"
                    asesor={asesor}
                    documento={docCartaAsesor}
                  />
                )}

                {/* Estado del Coasesor (si existe) */}
                {coasesor && (
                  <ReadOnlyAdvisorCard
                    titulo="Coasesor"
                    asesor={coasesor}
                    documento={docCartaCoasesor}
                  />
                )}

                {/* Estado del Coautor (si existe) */}
                {coautor && (
                  <ReadOnlyCoauthorCard
                    coautor={coautor}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Detalles del proyecto */}
          {(tesis.resumen || tesis.palabrasClave.length > 0 || tesis.lineaInvestigacion) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles del Proyecto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tesis.lineaInvestigacion && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Línea de Investigación
                    </p>
                    <p className="text-sm">{tesis.lineaInvestigacion}</p>
                  </div>
                )}
                {tesis.resumen && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Resumen
                    </p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{tesis.resumen}</p>
                  </div>
                )}
                {tesis.palabrasClave.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Palabras Clave
                    </p>
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
              {tesis.autores.map((a) => (
                <div key={a.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      a.tipoParticipante === 'AUTOR_PRINCIPAL'
                        ? 'bg-primary/10'
                        : a.estado === 'ACEPTADO'
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : a.estado === 'RECHAZADO'
                            ? 'bg-red-100 dark:bg-red-900/50'
                            : 'bg-yellow-100 dark:bg-yellow-900/50'
                    )}>
                      <User className={cn(
                        'w-4 h-4',
                        a.tipoParticipante === 'AUTOR_PRINCIPAL'
                          ? 'text-primary'
                          : a.estado === 'ACEPTADO'
                            ? 'text-green-600'
                            : a.estado === 'RECHAZADO'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {a.user.apellidoPaterno} {a.user.apellidoMaterno}, {a.user.nombres}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {a.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'Tesista 1' : 'Tesista 2'} • {a.studentCareer.codigoEstudiante}
                        </span>
                        {/* Mostrar estado solo para coautores */}
                        {a.tipoParticipante === 'COAUTOR' && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              a.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                              a.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                              a.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
                            )}
                          >
                            {a.estado === 'PENDIENTE' ? 'Pendiente' : a.estado === 'ACEPTADO' ? 'Aceptado' : 'Rechazado'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Botones de acción para coautores rechazados o pendientes (solo autor principal) */}
                  {puedeEditar && esAutorPrincipal && a.tipoParticipante === 'COAUTOR' && a.estado !== 'ACEPTADO' && (
                    <div className="flex gap-2 ml-12">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => abrirDialogoReemplazo('COAUTOR', a.id)}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Cambiar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => eliminarParticipante('COAUTOR', a.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Botón para agregar coautor si no existe (solo autor principal) */}
              {puedeEditar && esAutorPrincipal && !coautor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => abrirDialogoAgregar('COAUTOR')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Agregar Tesista 2
                </Button>
              )}
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
              {tesis.asesores.map((a) => (
                <div key={a.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      a.estado === 'ACEPTADO'
                        ? 'bg-green-100 dark:bg-green-900/50'
                        : a.estado === 'RECHAZADO'
                          ? 'bg-red-100 dark:bg-red-900/50'
                          : a.tipoAsesor === 'ASESOR'
                            ? 'bg-green-100 dark:bg-green-900/50'
                            : 'bg-purple-100 dark:bg-purple-900/50'
                    )}>
                      <GraduationCap className={cn(
                        'w-4 h-4',
                        a.estado === 'ACEPTADO'
                          ? 'text-green-600'
                          : a.estado === 'RECHAZADO'
                            ? 'text-red-600'
                            : a.tipoAsesor === 'ASESOR'
                              ? 'text-green-600'
                              : 'text-purple-600'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {a.user.apellidoPaterno} {a.user.apellidoMaterno}, {a.user.nombres}
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
                          {a.estado === 'PENDIENTE' ? 'Pendiente' : a.estado === 'ACEPTADO' ? 'Aceptado' : 'Rechazado'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {/* Botones de acción para asesores rechazados o pendientes (solo autor principal) */}
                  {puedeEditar && esAutorPrincipal && a.estado !== 'ACEPTADO' && (
                    <div className="flex gap-2 ml-12">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => abrirDialogoReemplazo(a.tipoAsesor === 'ASESOR' ? 'ASESOR' : 'COASESOR', a.id)}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Cambiar
                      </Button>
                      {/* Solo permitir eliminar coasesores */}
                      {a.tipoAsesor === 'COASESOR' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => eliminarParticipante('COASESOR', a.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Botón para agregar coasesor si no existe (solo autor principal) */}
              {puedeEditar && esAutorPrincipal && !coasesor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => abrirDialogoAgregar('COASESOR')}
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Agregar Coasesor
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info adicional */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Importante</p>
                  <p className="text-xs text-muted-foreground">
                    Una vez enviado a revisión, no podrás modificar los documentos hasta recibir observaciones o aprobación.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo de agregar/reemplazar participante */}
      <Dialog open={dialogReemplazo} onOpenChange={setDialogReemplazo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modoDialogo === 'AGREGAR' ? 'Agregar' : 'Cambiar'} {tipoReemplazo === 'COAUTOR' ? 'Tesista 2' : tipoReemplazo === 'ASESOR' ? 'Asesor' : 'Coasesor'}
            </DialogTitle>
            <DialogDescription>
              Busca y selecciona {tipoReemplazo === 'COAUTOR' ? 'al estudiante' : 'al docente'} que participará en tu proyecto.
              {tipoReemplazo === 'COAUTOR' && (
                <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                  Solo se mostrarán estudiantes de tu misma carrera.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={tipoReemplazo === 'COAUTOR' ? 'Buscar por nombre o código...' : 'Buscar por nombre...'}
                value={busquedaParticipante}
                onChange={(e) => setBusquedaParticipante(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Resultados */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {buscando ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : resultadosBusqueda.length > 0 ? (
                resultadosBusqueda.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setParticipanteSeleccionado(p)}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-all',
                      participanteSeleccionado?.id === p.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {tipoReemplazo === 'COAUTOR' ? (
                          <User className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <GraduationCap className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {p.apellidoPaterno} {p.apellidoMaterno}, {p.nombres}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tipoReemplazo === 'COAUTOR'
                            ? `${p.codigoEstudiante || 'Sin código'} • ${p.carrera || 'Sin carrera'}`
                            : `${p.codigoDocente || ''} • ${p.departamento || 'Sin departamento'}`}
                        </p>
                      </div>
                      {participanteSeleccionado?.id === p.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))
              ) : busquedaParticipante.length >= 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No se encontraron resultados</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
                </div>
              )}
            </div>

            {/* Seleccionado */}
            {participanteSeleccionado && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Seleccionado:</p>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {participanteSeleccionado.apellidoPaterno} {participanteSeleccionado.apellidoMaterno}, {participanteSeleccionado.nombres}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReemplazo(false)} disabled={reemplazando}>
              Cancelar
            </Button>
            <Button
              onClick={ejecutarReemplazo}
              disabled={!participanteSeleccionado || reemplazando}
            >
              {reemplazando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {modoDialogo === 'AGREGAR' ? 'Agregando...' : 'Cambiando...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {modoDialogo === 'AGREGAR' ? 'Agregar' : 'Confirmar cambio'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente para subir documentos con drag & drop
function DocumentUploadCard({
  titulo,
  descripcion,
  tipoDocumento,
  documento,
  onUpload,
  subiendo,
  accept,
  icon,
  iconColor,
  iconBg,
}: {
  titulo: string
  descripcion: string
  tipoDocumento: string
  documento?: Documento
  onUpload: (tipo: string, file: File) => void
  subiendo: boolean
  accept: string
  icon: React.ReactNode
  iconColor: string
  iconBg: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      onUpload(tipoDocumento, file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(tipoDocumento, file)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all',
        isDragging && 'border-primary bg-primary/5',
        documento && !isDragging && 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
        !documento && !isDragging && 'border-border hover:border-primary/50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icono */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            documento ? 'bg-green-100 dark:bg-green-900/50' : iconBg
          )}>
            {documento ? (
              <FileCheck className="w-6 h-6 text-green-600" />
            ) : (
              <span className={iconColor}>{icon}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">{titulo}</p>
              {!documento && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive">
                  Requerido
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{descripcion}</p>

            {documento ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-background border">
                <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{documento.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(documento.archivoTamano)}
                </span>
                <a
                  href={documento.archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  title="Ver documento"
                >
                  <Eye className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">
                  Arrastra un archivo aquí o
                </p>
              </div>
            )}
          </div>

          {/* Botón */}
          <div className="flex-shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleChange}
              className="hidden"
              disabled={subiendo}
            />
            <Button
              variant={documento ? 'outline' : 'default'}
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
            >
              {subiendo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : documento ? (
                <>
                  <Upload className="w-4 h-4 mr-1" />
                  Cambiar
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1" />
                  Subir
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay de carga */}
      {subiendo && (
        <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Subiendo documento...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para mostrar el estado de aceptación del asesor (sin upload)
function AdvisorStatusCard({
  titulo,
  descripcion,
  tipoAsesor,
  asesor,
  documento,
  icon,
  iconColor,
  iconBg,
}: {
  titulo: string
  descripcion: string
  tipoAsesor: string
  asesor: {
    id: string
    tipoAsesor: string
    estado: string
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
  }
  documento?: Documento
  icon: React.ReactNode
  iconColor: string
  iconBg: string
}) {
  const estadoConfig = ESTADO_ASESOR_CONFIG[asesor.estado] || ESTADO_ASESOR_CONFIG.PENDIENTE
  const nombreAsesor = `${asesor.user.nombres} ${asesor.user.apellidoPaterno} ${asesor.user.apellidoMaterno}`

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 transition-all',
        asesor.estado === 'ACEPTADO' && 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
        asesor.estado === 'PENDIENTE' && 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20',
        asesor.estado === 'RECHAZADO' && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icono */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            asesor.estado === 'ACEPTADO' ? 'bg-green-100 dark:bg-green-900/50' :
            asesor.estado === 'RECHAZADO' ? 'bg-red-100 dark:bg-red-900/50' : iconBg
          )}>
            {asesor.estado === 'ACEPTADO' ? (
              <FileCheck className="w-6 h-6 text-green-600" />
            ) : asesor.estado === 'RECHAZADO' ? (
              <X className="w-6 h-6 text-red-600" />
            ) : (
              <span className={iconColor}>{icon}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-sm">{titulo}</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0',
                  estadoConfig.color,
                  asesor.estado === 'ACEPTADO' && 'border-green-500',
                  asesor.estado === 'PENDIENTE' && 'border-yellow-500',
                  asesor.estado === 'RECHAZADO' && 'border-red-500'
                )}
              >
                {estadoConfig.label}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              {tipoAsesor}: <span className="font-medium">{nombreAsesor}</span>
            </p>

            {asesor.estado === 'ACEPTADO' && documento ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-background border">
                <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{documento.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(documento.archivoTamano)}
                </span>
                <a
                  href={documento.archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  title="Ver documento firmado"
                >
                  <Eye className="w-4 h-4" />
                </a>
              </div>
            ) : asesor.estado === 'PENDIENTE' ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Esperando carta de aceptación
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    El {tipoAsesor.toLowerCase()} debe subir y firmar digitalmente su carta
                  </p>
                </div>
              </div>
            ) : asesor.estado === 'RECHAZADO' ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Asesoría rechazada
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    El {tipoAsesor.toLowerCase()} ha rechazado la asesoría
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente para mostrar documentos en modo solo lectura
function ReadOnlyDocumentCard({
  titulo,
  documento,
  icon,
  iconColor,
  iconBg,
}: {
  titulo: string
  documento?: Documento
  icon: React.ReactNode
  iconColor: string
  iconBg: string
}) {
  const formatFileSize = (bytes: number) => {
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
            <span className={iconColor}>{icon}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm">{titulo}</p>
            {documento && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                Subido
              </Badge>
            )}
          </div>
          {documento ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-background border mt-2">
              <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm flex-1 truncate">{documento.nombre}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(documento.archivoTamano)}
              </span>
              <a
                href={documento.archivoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title="Ver documento"
              >
                <Eye className="w-4 h-4" />
              </a>
              <a
                href={documento.archivoUrl}
                download
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title="Descargar documento"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay documento subido</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente para mostrar estado del asesor en modo solo lectura
function ReadOnlyAdvisorCard({
  titulo,
  asesor,
  documento,
}: {
  titulo: string
  asesor: {
    id: string
    tipoAsesor: string
    estado: string
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
  }
  documento?: Documento
}) {
  const estadoConfig = ESTADO_ASESOR_CONFIG[asesor.estado] || ESTADO_ASESOR_CONFIG.PENDIENTE
  const nombreAsesor = `${asesor.user.nombres} ${asesor.user.apellidoPaterno} ${asesor.user.apellidoMaterno}`

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={cn(
      'rounded-xl border-2 p-4',
      asesor.estado === 'ACEPTADO' && 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
      asesor.estado === 'PENDIENTE' && 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20',
      asesor.estado === 'RECHAZADO' && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          asesor.estado === 'ACEPTADO' && 'bg-green-100 dark:bg-green-900/50',
          asesor.estado === 'PENDIENTE' && 'bg-yellow-100 dark:bg-yellow-900/50',
          asesor.estado === 'RECHAZADO' && 'bg-red-100 dark:bg-red-900/50'
        )}>
          {asesor.estado === 'ACEPTADO' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : asesor.estado === 'RECHAZADO' ? (
            <X className="w-5 h-5 text-red-600" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-sm">{titulo}</p>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                asesor.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                asesor.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                asesor.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
              )}
            >
              {asesor.estado === 'ACEPTADO' ? 'Aceptado' : asesor.estado === 'PENDIENTE' ? 'Pendiente' : 'Rechazado'}
            </Badge>
          </div>
          <p className="text-sm font-medium">{nombreAsesor}</p>
          <p className="text-xs text-muted-foreground">{asesor.user.email}</p>

          {/* Mostrar documento si existe */}
          {asesor.estado === 'ACEPTADO' && documento && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-background border mt-2">
              <FileCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm flex-1 truncate">Carta de Aceptación (Firmada)</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(documento.archivoTamano)}
              </span>
              <a
                href={documento.archivoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title="Ver carta firmada"
              >
                <Eye className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente para mostrar estado del coautor en modo solo lectura
function ReadOnlyCoauthorCard({
  coautor,
}: {
  coautor: {
    id: string
    tipoParticipante: string
    estado: string
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
    studentCareer: {
      codigoEstudiante: string
    }
  }
}) {
  const nombreCoautor = `${coautor.user.nombres} ${coautor.user.apellidoPaterno} ${coautor.user.apellidoMaterno}`

  return (
    <div className={cn(
      'rounded-xl border-2 p-4',
      coautor.estado === 'ACEPTADO' && 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
      coautor.estado === 'PENDIENTE' && 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20',
      coautor.estado === 'RECHAZADO' && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          coautor.estado === 'ACEPTADO' && 'bg-green-100 dark:bg-green-900/50',
          coautor.estado === 'PENDIENTE' && 'bg-yellow-100 dark:bg-yellow-900/50',
          coautor.estado === 'RECHAZADO' && 'bg-red-100 dark:bg-red-900/50'
        )}>
          {coautor.estado === 'ACEPTADO' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : coautor.estado === 'RECHAZADO' ? (
            <X className="w-5 h-5 text-red-600" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-sm">Coautor (Tesista 2)</p>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                coautor.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                coautor.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                coautor.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
              )}
            >
              {coautor.estado === 'ACEPTADO' ? 'Aceptado' : coautor.estado === 'PENDIENTE' ? 'Pendiente' : 'Rechazado'}
            </Badge>
          </div>
          <p className="text-sm font-medium">{nombreCoautor}</p>
          <p className="text-xs text-muted-foreground">
            {coautor.studentCareer.codigoEstudiante} • {coautor.user.email}
          </p>
        </div>
      </div>
    </div>
  )
}
