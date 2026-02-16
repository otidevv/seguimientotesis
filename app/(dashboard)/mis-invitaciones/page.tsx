'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  Mail,
  Search,
  User,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Invitacion {
  id: string
  tipoInvitacion: 'COAUTOR' | 'ASESOR' | 'COASESOR'
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
    facultad: { id: string; nombre: string }
    createdAt: string
  }
  autorPrincipal: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    email: string
  } | null
  tesistas?: {
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

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20]

const ESTADO_FILTER_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'ACEPTADO', label: 'Aceptadas' },
  { value: 'RECHAZADO', label: 'Rechazadas' },
]

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: typeof Users }> = {
  COAUTOR: { label: 'Coautor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50', icon: Users },
  ASESOR: { label: 'Asesor', color: 'bg-green-100 text-green-700 dark:bg-green-900/50', icon: GraduationCap },
  COASESOR: { label: 'Coasesor', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50', icon: GraduationCap },
}

export default function MisInvitacionesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [conteo, setConteo] = useState<Conteo>({ total: 0, pendientes: 0, aceptadas: 0, rechazadas: 0 })
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Dialogo de confirmacion
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedInvitacion, setSelectedInvitacion] = useState<Invitacion | null>(null)
  const [accion, setAccion] = useState<'ACEPTAR' | 'RECHAZAR' | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [procesando, setProcesando] = useState(false)

  // Detalle expandido
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Debounce busqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaDebounced(busqueda)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [busqueda])

  const loadInvitaciones = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(itemsPerPage))
      if (filtroEstado !== 'TODOS') params.set('estado', filtroEstado)
      if (busquedaDebounced) params.set('busqueda', busquedaDebounced)

      const response = await fetch(`/api/mis-invitaciones?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setInvitaciones(data.data)
        setConteo(data.conteo)
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
          setTotalItems(data.pagination.totalItems)
        }
      } else {
        toast.error(data.error || 'Error al cargar invitaciones')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setLoading(false)
    }
  }, [page, itemsPerPage, filtroEstado, busquedaDebounced])

  useEffect(() => {
    if (!authLoading && user) {
      loadInvitaciones()
    }
  }, [authLoading, user, loadInvitaciones])

  const handleFiltroEstado = (value: string) => {
    setPage(1)
    setFiltroEstado(value)
  }

  const handleItemsPerPage = (value: string) => {
    setPage(1)
    setItemsPerPage(Number(value))
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
      toast.error('Error de conexion')
    } finally {
      setProcesando(false)
    }
  }

  // Paginacion
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando invitaciones...</p>
      </div>
    )
  }

  const startItem = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, totalItems)

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Mis Invitaciones</h1>
          <p className="text-muted-foreground">
            Invitaciones para participar como coautor, asesor o coasesor en proyectos de tesis
          </p>
        </div>

        {/* Estadisticas */}
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

        {/* Tabla */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Invitaciones</CardTitle>
          </CardHeader>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo de tesis..."
                className="pl-9"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select value={filtroEstado} onValueChange={handleFiltroEstado}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent position="popper">
                {ESTADO_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CardContent className="p-0">
            <div className={cn('relative', loading && 'opacity-50 pointer-events-none')}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {invitaciones.length === 0 ? (
                <div className="py-16 text-center">
                  <Mail className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <h3 className="text-base font-semibold mb-1">No hay invitaciones</h3>
                  <p className="text-sm text-muted-foreground">
                    {busqueda
                      ? 'No se encontraron resultados para la busqueda'
                      : filtroEstado !== 'TODOS'
                        ? `No tienes invitaciones en estado "${ESTADO_FILTER_OPTIONS.find(o => o.value === filtroEstado)?.label}"`
                        : 'No tienes invitaciones de tesis'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tesis</TableHead>
                          <TableHead className="hidden md:table-cell">Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="hidden lg:table-cell">Invitado por</TableHead>
                          <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                          <TableHead className="w-[120px]">Accion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitaciones.map((inv) => {
                          const tipo = TIPO_CONFIG[inv.tipoInvitacion] || TIPO_CONFIG.COAUTOR
                          const TipoIcon = tipo.icon
                          const isExpanded = expandedId === inv.id

                          return (
                            <TableRow
                              key={inv.id}
                              className="cursor-pointer"
                              onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                            >
                              <TableCell>
                                <div className="max-w-[320px]">
                                  <p className="font-medium text-sm truncate">{inv.tesis.titulo}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {inv.tesis.carreraNombre} • {inv.tesis.facultad.nombre}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge className={cn('text-xs', tipo.color)}>
                                  <TipoIcon className="w-3 h-3 mr-1" />
                                  {tipo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    inv.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                                    inv.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                                    inv.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
                                  )}
                                >
                                  {inv.estado === 'PENDIENTE' && <Clock className="w-3 h-3 mr-1" />}
                                  {inv.estado === 'ACEPTADO' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {inv.estado === 'RECHAZADO' && <X className="w-3 h-3 mr-1" />}
                                  {inv.estado === 'PENDIENTE' ? 'Pendiente' : inv.estado === 'ACEPTADO' ? 'Aceptada' : 'Rechazada'}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {inv.autorPrincipal ? (
                                  <span className="text-sm">
                                    {inv.autorPrincipal.nombres} {inv.autorPrincipal.apellidoPaterno}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-xs">
                                  {new Date(inv.createdAt).toLocaleDateString('es-PE')}
                                </span>
                              </TableCell>
                              <TableCell>
                                {inv.estado === 'PENDIENTE' ? (
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => handleResponder(inv, 'ACEPTAR')}
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Aceptar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleResponder(inv, 'RECHAZAR')}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Respondida</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Detalle expandido */}
                  {expandedId && (
                    <ExpandedDetail
                      invitacion={invitaciones.find((i) => i.id === expandedId)!}
                      onClose={() => setExpandedId(null)}
                    />
                  )}

                  {/* Paginacion */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Filas por pagina</span>
                        <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPage}>
                          <SelectTrigger className="w-[70px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-muted-foreground hidden sm:block">
                        Mostrando {startItem} - {endItem} de {totalItems}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="hidden sm:flex items-center gap-1">
                        {getPageNumbers().map((p, i) =>
                          typeof p === 'string' ? (
                            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
                          ) : (
                            <Button
                              key={p}
                              variant={page === p ? 'default' : 'outline'}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          )
                        )}
                      </div>
                      <span className="sm:hidden text-sm text-muted-foreground px-2">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialogo de confirmacion */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {accion === 'ACEPTAR' ? 'Aceptar Invitacion' : 'Rechazar Invitacion'}
              </DialogTitle>
              <DialogDescription>
                {accion === 'ACEPTAR'
                  ? '¿Estas seguro de que deseas participar en este proyecto de tesis?'
                  : 'Por favor indica el motivo por el cual rechazas esta invitacion.'}
              </DialogDescription>
            </DialogHeader>

            {selectedInvitacion && (
              <div className="py-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-medium">{selectedInvitacion.tesis.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    Codigo: {selectedInvitacion.tesis.codigo}
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
                      placeholder="Explica brevemente por que no puedes participar..."
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimo 10 caracteres ({motivoRechazo.length}/10)
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
    </div>
  )
}

// Componente de detalle expandido debajo de la tabla
function ExpandedDetail({ invitacion, onClose }: { invitacion: Invitacion; onClose: () => void }) {
  const esInvitacionAsesor = invitacion.tipoInvitacion === 'ASESOR' || invitacion.tipoInvitacion === 'COASESOR'
  const asesor = invitacion.asesores?.find((a) => a.tipoAsesor === 'ASESOR')

  return (
    <div className="border-t bg-muted/30 px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Detalle de la invitacion</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Resumen */}
      {invitacion.tesis.resumen && (
        <div className="p-3 rounded-lg bg-background border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Resumen</p>
          <p className="text-sm">{invitacion.tesis.resumen}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Coautor: mostrar autor principal y asesor */}
        {!esInvitacionAsesor && (
          <>
            {invitacion.autorPrincipal && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
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
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-green-600" />
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

        {/* Asesor/Coasesor: mostrar tesistas */}
        {esInvitacionAsesor && invitacion.tesistas && invitacion.tesistas.length > 0 && (
          <div className="col-span-full">
            <p className="text-xs text-muted-foreground mb-2">Tesistas:</p>
            <div className="flex flex-wrap gap-3">
              {invitacion.tesistas.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
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

      {/* Motivo de rechazo */}
      {invitacion.estado === 'RECHAZADO' && invitacion.motivoRechazo && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Motivo del rechazo:</p>
          <p className="text-sm text-red-700 dark:text-red-300">{invitacion.motivoRechazo}</p>
        </div>
      )}
    </div>
  )
}
