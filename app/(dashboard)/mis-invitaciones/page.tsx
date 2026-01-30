'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
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
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Mail,
  User,
  Users,
  X,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Invitacion {
  id: string
  tipoInvitacion: 'COAUTOR' | 'ASESOR' | 'COASESOR' // Nuevo campo
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO'
  fechaRespuesta: string | null
  motivoRechazo: string | null
  createdAt: string
  tesis: {
    id: string
    codigo: string
    titulo: string
    resumen: string | null
    lineaInvestigacion: string | null
    estado: string
    carreraNombre: string
    facultad: {
      id: string
      nombre: string
    }
    createdAt: string
  }
  autorPrincipal: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    email: string
  } | null
  tesistas?: { // Para invitaciones de asesor
    id: string
    orden: number
    codigoEstudiante: string
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
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
    }
  }[]
  miCarrera: {
    codigoEstudiante: string
    carreraNombre: string
  } | null
}

interface Conteo {
  total: number
  pendientes: number
  aceptadas: number
  rechazadas: number
}

export default function MisInvitacionesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [conteo, setConteo] = useState<Conteo>({ total: 0, pendientes: 0, aceptadas: 0, rechazadas: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pendientes')

  // Estado para el diálogo de confirmación
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedInvitacion, setSelectedInvitacion] = useState<Invitacion | null>(null)
  const [accion, setAccion] = useState<'ACEPTAR' | 'RECHAZAR' | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      loadInvitaciones()
    }
  }, [authLoading, user])

  const loadInvitaciones = async () => {
    try {
      const response = await fetch('/api/mis-invitaciones')
      const data = await response.json()

      if (data.success) {
        setInvitaciones(data.data)
        setConteo(data.conteo)
      } else {
        toast.error(data.error || 'Error al cargar invitaciones')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleResponder = (invitacion: Invitacion, tipo: 'ACEPTAR' | 'RECHAZAR') => {
    setSelectedInvitacion(invitacion)
    setAccion(tipo)
    setMotivoRechazo('')
    setDialogOpen(true)
  }

  const confirmarRespuesta = async () => {
    if (!selectedInvitacion || !accion) return

    if (accion === 'RECHAZAR' && motivoRechazo.trim().length < 10) {
      toast.error('El motivo de rechazo debe tener al menos 10 caracteres')
      return
    }

    setProcesando(true)

    try {
      const response = await fetch(`/api/mis-invitaciones/${selectedInvitacion.id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion,
          motivoRechazo: accion === 'RECHAZAR' ? motivoRechazo : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setDialogOpen(false)
        loadInvitaciones()
      } else {
        toast.error(data.error || 'Error al procesar respuesta')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setProcesando(false)
    }
  }

  const filtrarInvitaciones = (estado: string) => {
    if (estado === 'todas') return invitaciones
    return invitaciones.filter((i) => i.estado === estado.toUpperCase())
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando invitaciones...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis Invitaciones</h1>
          <p className="text-muted-foreground">
            Invitaciones para participar como coautor, asesor o coasesor en proyectos de tesis
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conteo.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
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
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
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
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conteo.rechazadas}</p>
                <p className="text-xs text-muted-foreground">Rechazadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendientes" className="gap-2">
            <Clock className="w-4 h-4" />
            Pendientes
            {conteo.pendientes > 0 && (
              <Badge variant="secondary" className="ml-1">
                {conteo.pendientes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="aceptado" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Aceptadas
          </TabsTrigger>
          <TabsTrigger value="rechazado" className="gap-2">
            <X className="w-4 h-4" />
            Rechazadas
          </TabsTrigger>
        </TabsList>

        {['pendientes', 'aceptado', 'rechazado'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {filtrarInvitaciones(tab === 'pendientes' ? 'PENDIENTE' : tab).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-1">No hay invitaciones</p>
                  <p className="text-sm text-muted-foreground">
                    {tab === 'pendientes'
                      ? 'No tienes invitaciones pendientes por responder'
                      : tab === 'aceptado'
                        ? 'No has aceptado ninguna invitación aún'
                        : 'No has rechazado ninguna invitación'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filtrarInvitaciones(tab === 'pendientes' ? 'PENDIENTE' : tab).map((invitacion) => (
                  <InvitacionCard
                    key={invitacion.id}
                    invitacion={invitacion}
                    onAceptar={() => handleResponder(invitacion, 'ACEPTAR')}
                    onRechazar={() => handleResponder(invitacion, 'RECHAZAR')}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Diálogo de confirmación */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accion === 'ACEPTAR' ? 'Aceptar Invitación' : 'Rechazar Invitación'}
            </DialogTitle>
            <DialogDescription>
              {accion === 'ACEPTAR'
                ? '¿Estás seguro de que deseas participar como coautor en este proyecto de tesis?'
                : 'Por favor indica el motivo por el cual rechazas esta invitación.'}
            </DialogDescription>
          </DialogHeader>

          {selectedInvitacion && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="font-medium">{selectedInvitacion.tesis.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  Código: {selectedInvitacion.tesis.codigo}
                </p>
                {selectedInvitacion.autorPrincipal && (
                  <p className="text-sm text-muted-foreground">
                    Invitado por: {selectedInvitacion.autorPrincipal.nombres}{' '}
                    {selectedInvitacion.autorPrincipal.apellidoPaterno}
                  </p>
                )}
              </div>

              {accion === 'RECHAZAR' && (
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium">Motivo del rechazo *</label>
                  <Textarea
                    placeholder="Explica brevemente por qué no puedes participar..."
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 10 caracteres ({motivoRechazo.length}/10)
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
              disabled={procesando || (accion === 'RECHAZAR' && motivoRechazo.length < 10)}
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
              {accion === 'ACEPTAR' ? 'Aceptar' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente de tarjeta de invitación
function InvitacionCard({
  invitacion,
  onAceptar,
  onRechazar,
}: {
  invitacion: Invitacion
  onAceptar: () => void
  onRechazar: () => void
}) {
  const estadoPendiente = invitacion.estado === 'PENDIENTE'
  const esInvitacionAsesor = invitacion.tipoInvitacion === 'ASESOR' || invitacion.tipoInvitacion === 'COASESOR'
  const asesor = invitacion.asesores?.find((a) => a.tipoAsesor === 'ASESOR')

  // Configuración de colores según tipo de invitación
  const tipoConfig = {
    COAUTOR: { label: 'Coautor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50', icon: Users },
    ASESOR: { label: 'Asesor', color: 'bg-green-100 text-green-700 dark:bg-green-900/50', icon: GraduationCap },
    COASESOR: { label: 'Coasesor', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50', icon: GraduationCap },
  }
  const tipo = tipoConfig[invitacion.tipoInvitacion] || tipoConfig.COAUTOR

  return (
    <Card className={cn(
      'transition-all',
      estadoPendiente && 'border-yellow-300 dark:border-yellow-800'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="font-mono text-xs">
                {invitacion.tesis.codigo}
              </Badge>
              {/* Tipo de invitación */}
              <Badge className={cn('text-xs', tipo.color)}>
                <tipo.icon className="w-3 h-3 mr-1" />
                {tipo.label}
              </Badge>
              {/* Estado */}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  invitacion.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                  invitacion.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                  invitacion.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
                )}
              >
                {invitacion.estado === 'PENDIENTE' && <Clock className="w-3 h-3 mr-1" />}
                {invitacion.estado === 'ACEPTADO' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {invitacion.estado === 'RECHAZADO' && <X className="w-3 h-3 mr-1" />}
                {invitacion.estado}
              </Badge>
            </div>
            <CardTitle className="text-lg line-clamp-2">{invitacion.tesis.titulo}</CardTitle>
            <CardDescription className="mt-1">
              {invitacion.tesis.carreraNombre} • {invitacion.tesis.facultad.nombre}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resumen si existe */}
        {invitacion.tesis.resumen && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Resumen</p>
            <p className="text-sm line-clamp-3">{invitacion.tesis.resumen}</p>
          </div>
        )}

        {/* Info del proyecto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Para COAUTOR: Mostrar autor principal y asesor */}
          {!esInvitacionAsesor && (
            <>
              {invitacion.autorPrincipal && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Invitado por</p>
                    <p className="text-sm font-medium">
                      {invitacion.autorPrincipal.nombres} {invitacion.autorPrincipal.apellidoPaterno}
                    </p>
                  </div>
                </div>
              )}
              {asesor && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Asesor</p>
                    <p className="text-sm font-medium">
                      {asesor.user.nombres} {asesor.user.apellidoPaterno}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Para ASESOR/COASESOR: Mostrar tesistas */}
          {esInvitacionAsesor && invitacion.tesistas && invitacion.tesistas.length > 0 && (
            <div className="col-span-full">
              <p className="text-xs text-muted-foreground mb-2">Tesistas:</p>
              <div className="space-y-2">
                {invitacion.tesistas.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t.user.apellidoPaterno} {t.user.apellidoMaterno}, {t.user.nombres}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.orden === 1 ? 'Tesista 1' : 'Tesista 2'} • {t.codigoEstudiante}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Invitación recibida el {new Date(invitacion.createdAt).toLocaleDateString('es-PE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>

        {/* Motivo de rechazo si fue rechazada */}
        {invitacion.estado === 'RECHAZADO' && invitacion.motivoRechazo && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
              Motivo del rechazo:
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">{invitacion.motivoRechazo}</p>
          </div>
        )}

        {/* Botones de acción solo si está pendiente */}
        {estadoPendiente && (
          <>
            <Separator />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onRechazar}
              >
                <X className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={onAceptar}
              >
                <Check className="w-4 h-4 mr-2" />
                Aceptar Invitación
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
