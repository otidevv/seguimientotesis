'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  FileText,
  Eye,
  Check,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Tesista {
  id: string
  tipoParticipante: string
  codigoEstudiante: string
  user: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    email: string
  }
}

interface Asesoria {
  id: string
  tesisId: string
  tipoAsesor: 'ASESOR' | 'COASESOR'
  estadoAceptacion: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO'
  fechaRespuesta: string | null
  createdAt: string
  tesis: {
    id: string
    codigo: string
    titulo: string
    estado: string
    carreraNombre: string
    facultad: {
      id: string
      nombre: string
    }
    fechaRegistro: string | null
  }
  tesistas: Tesista[]
  documentos: {
    tieneProyecto: boolean
    tieneCartaAsesor: boolean
    tieneCartaCoasesor: boolean
  }
}

interface Conteo {
  total: number
  pendientes: number
  aceptadas: number
  rechazadas: number
}

const ESTADO_TESIS_CONFIG: Record<string, { label: string; color: string }> = {
  BORRADOR: { label: 'Borrador', color: 'bg-gray-500' },
  REGISTRO_PENDIENTE: { label: 'En Revisión', color: 'bg-yellow-500' },
  PROYECTO_OBSERVADO: { label: 'Observado', color: 'bg-orange-500' },
  PROYECTO_APROBADO: { label: 'Aprobado', color: 'bg-green-500' },
  EN_DESARROLLO: { label: 'En Desarrollo', color: 'bg-blue-500' },
}

export default function MisAsesoriasPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole } = useAuth()
  const [asesorias, setAsesorias] = useState<Asesoria[]>([])
  const [conteo, setConteo] = useState<Conteo>({ total: 0, pendientes: 0, aceptadas: 0, rechazadas: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabActivo, setTabActivo] = useState('pendientes')

  // Estado para el diálogo de confirmación
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAsesoria, setSelectedAsesoria] = useState<Asesoria | null>(null)
  const [accion, setAccion] = useState<'ACEPTAR' | 'RECHAZAR' | null>(null)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      loadAsesorias()
    }
  }, [authLoading, user])

  const loadAsesorias = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mis-asesorias')
      const data = await response.json()

      if (data.success) {
        setAsesorias(data.data)
        setConteo(data.conteo)
      } else {
        setError(data.error || 'Error al cargar asesorías')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleResponder = (asesoria: Asesoria, tipo: 'ACEPTAR' | 'RECHAZAR') => {
    setSelectedAsesoria(asesoria)
    setAccion(tipo)
    setDialogOpen(true)
  }

  const confirmarRespuesta = async () => {
    if (!selectedAsesoria || !accion) return

    setProcesando(true)

    try {
      const response = await fetch(`/api/mis-invitaciones/${selectedAsesoria.id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setDialogOpen(false)
        loadAsesorias()
        // Si aceptó, cambiar a la pestaña de aceptadas
        if (accion === 'ACEPTAR') {
          setTabActivo('aceptadas')
        }
      } else {
        toast.error(data.error || 'Error al procesar respuesta')
      }
    } catch {
      toast.error('Error de conexión')
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

  // Verificar que el usuario es docente
  if (!hasRole('DOCENTE')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Esta sección es solo para docentes.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const asesoriasFiltered = asesorias.filter((a) => {
    if (tabActivo === 'pendientes') return a.estadoAceptacion === 'PENDIENTE'
    if (tabActivo === 'aceptadas') return a.estadoAceptacion === 'ACEPTADO'
    if (tabActivo === 'rechazadas') return a.estadoAceptacion === 'RECHAZADO'
    return true
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            Mis Asesorías
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las tesis donde eres asesor o coasesor
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conteo.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conteo.pendientes}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conteo.aceptadas}</p>
                <p className="text-xs text-muted-foreground">Aceptadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conteo.rechazadas}</p>
                <p className="text-xs text-muted-foreground">Rechazadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs y Lista */}
      <Tabs value={tabActivo} onValueChange={setTabActivo}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pendientes" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Pendientes</span>
            {conteo.pendientes > 0 && (
              <Badge variant="secondary" className="ml-1">
                {conteo.pendientes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="aceptadas" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Aceptadas</span>
          </TabsTrigger>
          <TabsTrigger value="rechazadas" className="gap-2">
            <XCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Rechazadas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tabActivo} className="mt-4">
          {asesoriasFiltered.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {tabActivo === 'pendientes' && 'No tienes solicitudes pendientes'}
                  {tabActivo === 'aceptadas' && 'No tienes asesorías aceptadas'}
                  {tabActivo === 'rechazadas' && 'No has rechazado ninguna solicitud'}
                </h3>
                <p className="text-muted-foreground">
                  {tabActivo === 'pendientes' &&
                    'Cuando un estudiante te proponga como asesor, aparecerá aquí.'}
                  {tabActivo === 'aceptadas' &&
                    'Las tesis que aceptes asesorar aparecerán aquí.'}
                  {tabActivo === 'rechazadas' &&
                    'Las solicitudes rechazadas aparecerán aquí.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {asesoriasFiltered.map((asesoria) => {
                const estadoConfig =
                  ESTADO_TESIS_CONFIG[asesoria.tesis.estado] || ESTADO_TESIS_CONFIG.BORRADOR

                return (
                  <Card key={asesoria.id} className={cn(
                    'hover:shadow-md transition-shadow',
                    asesoria.estadoAceptacion === 'PENDIENTE' && 'border-yellow-300 dark:border-yellow-800'
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {asesoria.tesis.codigo}
                            </Badge>
                            <Badge
                              className={cn(
                                estadoConfig.color,
                                'text-white text-xs'
                              )}
                            >
                              {estadoConfig.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                asesoria.tipoAsesor === 'ASESOR'
                                  ? 'border-green-500 text-green-600'
                                  : 'border-purple-500 text-purple-600'
                              )}
                            >
                              {asesoria.tipoAsesor === 'ASESOR' ? 'Asesor' : 'Coasesor'}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg leading-tight line-clamp-2">
                            {asesoria.tesis.titulo}
                          </CardTitle>
                          <CardDescription>
                            {asesoria.tesis.carreraNombre} • {asesoria.tesis.facultad.nombre}
                          </CardDescription>
                        </div>
                        {/* Botón Ver detalles - solo para no pendientes */}
                        {asesoria.estadoAceptacion !== 'PENDIENTE' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/mis-asesorias/${asesoria.tesisId}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col sm:flex-row gap-4 text-sm">
                        {/* Tesistas */}
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-muted-foreground">
                              {asesoria.tesistas.length > 1 ? 'Tesistas: ' : 'Tesista: '}
                            </span>
                            <span>
                              {asesoria.tesistas
                                .map(
                                  (t) =>
                                    `${t.user.apellidoPaterno} ${t.user.apellidoMaterno}, ${t.user.nombres}`
                                )
                                .join(' & ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción para solicitudes pendientes */}
                      {asesoria.estadoAceptacion === 'PENDIENTE' && (
                        <>
                          <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              <Clock className="w-4 h-4 inline mr-1" />
                              Tienes una solicitud pendiente de respuesta.
                            </p>
                          </div>

                          <Separator className="my-4" />

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="flex-1"
                            >
                              <Link href={`/mis-asesorias/${asesoria.tesisId}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Proyecto
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleResponder(asesoria, 'RECHAZAR')}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleResponder(asesoria, 'ACEPTAR')}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Aceptar
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de confirmación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accion === 'ACEPTAR' ? 'Aceptar Asesoría' : 'Rechazar Asesoría'}
            </DialogTitle>
            <DialogDescription>
              {accion === 'ACEPTAR'
                ? `¿Estás seguro de que deseas ser ${selectedAsesoria?.tipoAsesor === 'ASESOR' ? 'asesor' : 'coasesor'} de este proyecto de tesis?`
                : `¿Estás seguro de que deseas rechazar ser ${selectedAsesoria?.tipoAsesor === 'ASESOR' ? 'asesor' : 'coasesor'} de este proyecto?`}
            </DialogDescription>
          </DialogHeader>

          {selectedAsesoria && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="font-medium line-clamp-2">{selectedAsesoria.tesis.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  Código: {selectedAsesoria.tesis.codigo}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedAsesoria.tesistas.length > 1 ? 'Tesistas: ' : 'Tesista: '}
                  {selectedAsesoria.tesistas
                    .map((t) => `${t.user.nombres} ${t.user.apellidoPaterno}`)
                    .join(' & ')}
                </p>
              </div>

              {accion === 'ACEPTAR' && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    Al aceptar, te comprometes a asesorar este proyecto de tesis.
                  </p>
                </div>
              )}

              {accion === 'RECHAZAR' && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    El estudiante deberá buscar otro {selectedAsesoria.tipoAsesor === 'ASESOR' ? 'asesor' : 'coasesor'}.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={procesando}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarRespuesta}
              disabled={procesando}
              className={cn(
                accion === 'ACEPTAR' && 'bg-green-600 hover:bg-green-700',
                accion === 'RECHAZAR' && 'bg-red-600 hover:bg-red-700'
              )}
            >
              {procesando ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : accion === 'ACEPTAR' ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              {procesando ? 'Procesando...' : accion === 'ACEPTAR' ? 'Aceptar' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
