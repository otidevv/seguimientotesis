'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  FileText,
  Eye,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
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
  BORRADOR: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  REGISTRO_PENDIENTE: { label: 'En Revisión', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
  PROYECTO_OBSERVADO: { label: 'Observado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' },
  PROYECTO_APROBADO: { label: 'Aprobado', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  EN_DESARROLLO: { label: 'En Desarrollo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
}

const ESTADO_ACEPTACION_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  PENDIENTE: { label: 'Pendiente', icon: Clock, color: 'border-yellow-500 text-yellow-600 dark:text-yellow-400' },
  ACEPTADO: { label: 'Aceptado', icon: CheckCircle2, color: 'border-green-500 text-green-600 dark:text-green-400' },
  RECHAZADO: { label: 'Rechazado', icon: XCircle, color: 'border-red-500 text-red-600 dark:text-red-400' },
}

const ITEMS_PER_PAGE = 10

export default function MisAsesoriasPage() {
  const { user, isLoading: authLoading, hasRole } = useAuth()
  const [asesorias, setAsesorias] = useState<Asesoria[]>([])
  const [conteo, setConteo] = useState<Conteo>({ total: 0, pendientes: 0, aceptadas: 0, rechazadas: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)

  // Diálogo
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAsesoria, setSelectedAsesoria] = useState<Asesoria | null>(null)
  const [accion, setAccion] = useState<'ACEPTAR' | 'RECHAZAR' | null>(null)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      loadAsesorias()
    }
  }, [authLoading, user])

  // Reset página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, filtroEstado, filtroTipo])

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

  // Filtrado
  const asesoriasFiltered = useMemo(() => {
    return asesorias.filter((a) => {
      // Filtro por estado de aceptación
      if (filtroEstado !== 'todos' && a.estadoAceptacion !== filtroEstado) return false
      // Filtro por tipo de asesor
      if (filtroTipo !== 'todos' && a.tipoAsesor !== filtroTipo) return false
      // Búsqueda
      if (busqueda.trim()) {
        const term = busqueda.toLowerCase()
        const matchTitulo = a.tesis.titulo.toLowerCase().includes(term)
        const matchCodigo = a.tesis.codigo.toLowerCase().includes(term)
        const matchCarrera = a.tesis.carreraNombre.toLowerCase().includes(term)
        const matchTesista = a.tesistas.some(
          (t) =>
            `${t.user.nombres} ${t.user.apellidoPaterno} ${t.user.apellidoMaterno}`.toLowerCase().includes(term) ||
            t.codigoEstudiante.toLowerCase().includes(term)
        )
        if (!matchTitulo && !matchCodigo && !matchCarrera && !matchTesista) return false
      }
      return true
    })
  }, [asesorias, filtroEstado, filtroTipo, busqueda])

  // Paginación
  const totalPaginas = Math.max(1, Math.ceil(asesoriasFiltered.length / ITEMS_PER_PAGE))
  const asesoriasPage = useMemo(() => {
    const start = (paginaActual - 1) * ITEMS_PER_PAGE
    return asesoriasFiltered.slice(start, start + ITEMS_PER_PAGE)
  }, [asesoriasFiltered, paginaActual])

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
        body: JSON.stringify({ accion }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setDialogOpen(false)
        loadAsesorias()
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

  if (!hasRole('DOCENTE')) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <Card>
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />
          Mis Asesorías
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestiona las tesis donde eres asesor o coasesor
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
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
          <CardContent className="py-4">
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
          <CardContent className="py-4">
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
          <CardContent className="py-4">
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
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, código, carrera o tesista..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-3">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                  <SelectItem value="ACEPTADO">Aceptadas</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ASESOR">Asesor</SelectItem>
                  <SelectItem value="COASESOR">Coasesor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {asesoriasFiltered.length === 0 ? (
            <div className="py-16 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-lg font-medium mb-1">
                {asesorias.length === 0
                  ? 'No tienes asesorías registradas'
                  : 'No se encontraron resultados'}
              </p>
              <p className="text-sm text-muted-foreground">
                {asesorias.length === 0
                  ? 'Cuando un estudiante te proponga como asesor, aparecerá aquí.'
                  : 'Intenta cambiar los filtros o el término de búsqueda.'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Código</TableHead>
                    <TableHead>Tesis</TableHead>
                    <TableHead className="hidden lg:table-cell">Tesistas</TableHead>
                    <TableHead className="w-[100px]">Rol</TableHead>
                    <TableHead className="w-[110px]">Estado Tesis</TableHead>
                    <TableHead className="w-[110px]">Mi Estado</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asesoriasPage.map((asesoria) => {
                    const estadoTesis = ESTADO_TESIS_CONFIG[asesoria.tesis.estado] || ESTADO_TESIS_CONFIG.BORRADOR
                    const estadoAceptacion = ESTADO_ACEPTACION_CONFIG[asesoria.estadoAceptacion]
                    const IconEstado = estadoAceptacion.icon

                    return (
                      <TableRow key={asesoria.id}>
                        {/* Código */}
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {asesoria.tesis.codigo}
                          </Badge>
                        </TableCell>

                        {/* Tesis */}
                        <TableCell>
                          <div className="min-w-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="font-medium text-sm leading-tight line-clamp-2 max-w-md">
                                    {asesoria.tesis.titulo}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-sm">
                                  <p>{asesoria.tesis.titulo}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {asesoria.tesis.carreraNombre}
                            </p>
                            {/* Tesistas en móvil */}
                            <div className="lg:hidden mt-1">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {asesoria.tesistas
                                  .map((t) => `${t.user.apellidoPaterno} ${t.user.apellidoMaterno}`)
                                  .join(', ')}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Tesistas (desktop) */}
                        <TableCell className="hidden lg:table-cell">
                          <div className="space-y-0.5">
                            {asesoria.tesistas.map((t) => (
                              <p key={t.id} className="text-sm whitespace-normal">
                                {t.user.apellidoPaterno} {t.user.apellidoMaterno}, {t.user.nombres}
                              </p>
                            ))}
                          </div>
                        </TableCell>

                        {/* Tipo de asesor */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              asesoria.tipoAsesor === 'ASESOR'
                                ? 'border-green-500 text-green-600 dark:text-green-400'
                                : 'border-purple-500 text-purple-600 dark:text-purple-400'
                            )}
                          >
                            {asesoria.tipoAsesor === 'ASESOR' ? 'Asesor' : 'Coasesor'}
                          </Badge>
                        </TableCell>

                        {/* Estado tesis */}
                        <TableCell>
                          <Badge className={cn('text-xs', estadoTesis.color)}>
                            {estadoTesis.label}
                          </Badge>
                        </TableCell>

                        {/* Estado aceptación */}
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs gap-1', estadoAceptacion.color)}>
                            <IconEstado className="w-3 h-3" />
                            {estadoAceptacion.label}
                          </Badge>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {asesoria.estadoAceptacion === 'PENDIENTE' ? (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 cursor-pointer"
                                        onClick={() => handleResponder(asesoria, 'ACEPTAR')}
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Aceptar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                        onClick={() => handleResponder(asesoria, 'RECHAZAR')}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Rechazar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" asChild>
                                        <Link href={`/mis-asesorias/${asesoria.tesisId}`}>
                                          <Eye className="w-4 h-4" />
                                        </Link>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ver proyecto</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" asChild>
                                      <Link href={`/mis-asesorias/${asesoria.tesisId}`}>
                                        <Eye className="w-4 h-4" />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver detalles</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Paginación */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((paginaActual - 1) * ITEMS_PER_PAGE) + 1} a{' '}
                  {Math.min(paginaActual * ITEMS_PER_PAGE, asesoriasFiltered.length)} de{' '}
                  {asesoriasFiltered.length} asesorías
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => setPaginaActual(1)}
                    disabled={paginaActual === 1}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPaginas <= 5) return true
                        if (p === 1 || p === totalPaginas) return true
                        return Math.abs(p - paginaActual) <= 1
                      })
                      .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('dots')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((item, i) =>
                        item === 'dots' ? (
                          <span key={`dots-${i}`} className="px-1 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            key={item}
                            variant={paginaActual === item ? 'default' : 'outline'}
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => setPaginaActual(item as number)}
                          >
                            {item}
                          </Button>
                        )
                      )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={() => setPaginaActual(totalPaginas)}
                    disabled={paginaActual === totalPaginas}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
