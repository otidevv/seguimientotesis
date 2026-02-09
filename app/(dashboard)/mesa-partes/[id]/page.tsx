'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  History,
  Inbox,
  Loader2,
  User,
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
  historial: HistorialItem[]
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  EN_REVISION: {
    label: 'En Revisión',
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

export default function DetalleProyectoMesaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole } = useAuth()

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)

  // Diálogo de acción
  const [dialogOpen, setDialogOpen] = useState(false)
  const [accionActual, setAccionActual] = useState<'APROBAR' | 'OBSERVAR' | 'RECHAZAR' | null>(null)
  const [comentario, setComentario] = useState('')

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
    } catch (error) {
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

    // Validar comentario para observar/rechazar
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
    } catch (error) {
      toast.error('Error al procesar acción')
    } finally {
      setProcesando(false)
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

  if (!hasRole('MESA_PARTES') && !hasRole('ADMIN') && !hasRole('SUPER_ADMIN')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Esta sección es solo para personal de Mesa de Partes.
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
  const docProyecto = proyecto.documentos.find((d) => d.tipo === 'PROYECTO')
  const docCartaAsesor = proyecto.documentos.find((d) => d.tipo === 'CARTA_ACEPTACION_ASESOR')
  const docCartaCoasesor = proyecto.documentos.find((d) => d.tipo === 'CARTA_ACEPTACION_COASESOR')

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
              {proyecto.facultad && (
                <Badge variant="secondary">{proyecto.facultad.nombre}</Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{proyecto.titulo}</h1>
            <p className="text-muted-foreground mt-1">{proyecto.carrera}</p>
          </div>
        </div>

        {/* Acciones */}
        {puedeGestionar && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Acciones de Revisión</p>
                  <p className="text-sm text-muted-foreground">
                    Revisa el proyecto y toma una decisión
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => abrirDialogo('APROBAR')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Documentos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Proyecto de Tesis */}
                <DocumentoCard
                  titulo="Proyecto de Tesis"
                  documento={docProyecto}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-100 dark:bg-blue-900/50"
                />

                {/* Carta del Asesor */}
                <DocumentoCard
                  titulo="Carta de Aceptación del Asesor"
                  documento={docCartaAsesor}
                  iconColor="text-green-600"
                  iconBg="bg-green-100 dark:bg-green-900/50"
                />

                {/* Carta del Coasesor (si existe) */}
                {docCartaCoasesor && (
                  <DocumentoCard
                    titulo="Carta de Aceptación del Coasesor"
                    documento={docCartaCoasesor}
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
                  <CardTitle className="text-lg">Detalles del Proyecto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proyecto.lineaInvestigacion && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Línea de Investigación
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Diálogo de acción */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionActual === 'APROBAR' && 'Aprobar Proyecto'}
              {accionActual === 'OBSERVAR' && 'Observar Proyecto'}
              {accionActual === 'RECHAZAR' && 'Rechazar Proyecto'}
            </DialogTitle>
            <DialogDescription>
              {accionActual === 'APROBAR' && 'El proyecto será aprobado y el estudiante será notificado.'}
              {accionActual === 'OBSERVAR' && 'Indica las observaciones que debe corregir el estudiante.'}
              {accionActual === 'RECHAZAR' && 'Indica el motivo del rechazo. Esta acción es definitiva.'}
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
