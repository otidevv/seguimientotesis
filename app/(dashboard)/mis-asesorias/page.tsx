'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Users,
  User,
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

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20]

const ESTADO_TESIS_CONFIG: Record<string, { label: string; color: string }> = {
  BORRADOR: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  REGISTRO_PENDIENTE: { label: 'En Revision', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
  PROYECTO_OBSERVADO: { label: 'Observado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' },
  PROYECTO_APROBADO: { label: 'Aprobado', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  EN_DESARROLLO: { label: 'En Desarrollo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  ASIGNANDO_JURADOS: { label: 'Asignando Jurados', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  EN_EVALUACION_JURADO: { label: 'En Evaluacion', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
  OBSERVADA_JURADO: { label: 'Observada', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' },
  INFORME_FINAL: { label: 'Informe Final', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300' },
  APROBADA: { label: 'Aprobada', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
}

const ESTADO_ACEPTACION_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  PENDIENTE: { label: 'Pendiente', icon: Clock, color: 'border-yellow-500 text-yellow-600 dark:text-yellow-400' },
  ACEPTADO: { label: 'Aceptado', icon: CheckCircle2, color: 'border-green-500 text-green-600 dark:text-green-400' },
  RECHAZADO: { label: 'Rechazado', icon: XCircle, color: 'border-red-500 text-red-600 dark:text-red-400' },
}

export default function MisAsesoriasPage() {
  const { user, isLoading: authLoading, hasRole } = useAuth()
  const [asesorias, setAsesorias] = useState<Asesoria[]>([])
  const [conteo, setConteo] = useState<Conteo>({ total: 0, pendientes: 0, aceptadas: 0, rechazadas: 0 })
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  // Paginacion
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Fila expandida
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Dialogo
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAsesoria, setSelectedAsesoria] = useState<Asesoria | null>(null)
  const [accion, setAccion] = useState<'ACEPTAR' | 'RECHAZAR' | null>(null)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      loadAsesorias()
    }
  }, [authLoading, user])

  // Reset pagina al cambiar filtros
  useEffect(() => {
    setPage(1)
  }, [busqueda, filtroEstado, filtroTipo, itemsPerPage])

  const loadAsesorias = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mis-asesorias')
      const data = await response.json()

      if (data.success) {
        setAsesorias(data.data)
        setConteo(data.conteo)
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

  // Filtrado client-side
  const asesoriasFiltered = useMemo(() => {
    return asesorias.filter((a) => {
      if (filtroEstado !== 'todos' && a.estadoAceptacion !== filtroEstado) return false
      if (filtroTipo !== 'todos' && a.tipoAsesor !== filtroTipo) return false
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

  // Paginacion
  const totalPages = Math.max(1, Math.ceil(asesoriasFiltered.length / itemsPerPage))
  const asesoriasPage = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return asesoriasFiltered.slice(start, start + itemsPerPage)
  }, [asesoriasFiltered, page, itemsPerPage])

  const startItem = asesoriasFiltered.length === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, asesoriasFiltered.length)

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
      toast.error('Error de conexion')
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

  if (!hasRole('DOCENTE') && !hasRole('EXTERNO')) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">Esta seccion es solo para docentes.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Mis Asesorias</h1>
          <p className="text-muted-foreground">
            Gestiona las tesis donde eres asesor o coasesor
          </p>
        </div>

        {/* Estadisticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
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

        {/* Tabla */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Asesorias Asignadas</CardTitle>
          </CardHeader>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo, codigo, carrera o tesista..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-3">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendientes</SelectItem>
                  <SelectItem value="ACEPTADO">Aceptadas</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  <SelectItem value="ASESOR">Asesor</SelectItem>
                  <SelectItem value="COASESOR">Coasesor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <CardContent className="p-0">
            <div className={cn('relative', loading && 'opacity-50 pointer-events-none')}>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {asesoriasFiltered.length === 0 ? (
                <div className="py-16 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <h3 className="text-base font-semibold mb-1">
                    {asesorias.length === 0 ? 'No tienes asesorias registradas' : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {asesorias.length === 0
                      ? 'Cuando un estudiante te proponga como asesor, aparecera aqui.'
                      : 'Intenta cambiar los filtros o el termino de busqueda.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tesis</TableHead>
                          <TableHead className="hidden md:table-cell">Tesista</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead className="hidden lg:table-cell">Estado Tesis</TableHead>
                          <TableHead>Mi Estado</TableHead>
                          <TableHead className="w-[120px] text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {asesoriasPage.map((asesoria) => {
                          const estadoTesis = ESTADO_TESIS_CONFIG[asesoria.tesis.estado] || ESTADO_TESIS_CONFIG.BORRADOR
                          const estadoAceptacion = ESTADO_ACEPTACION_CONFIG[asesoria.estadoAceptacion]
                          const IconEstado = estadoAceptacion.icon
                          const isExpanded = expandedId === asesoria.id
                          const primerTesista = asesoria.tesistas[0]
                          const tesistasExtra = asesoria.tesistas.length - 1

                          return (
                            <TableRow
                              key={asesoria.id}
                              className={cn('cursor-pointer', isExpanded && 'bg-muted/30')}
                              onClick={() => setExpandedId(isExpanded ? null : asesoria.id)}
                            >
                              <TableCell>
                                <div className="max-w-[320px]">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                      {asesoria.tesis.codigo}
                                    </Badge>
                                  </div>
                                  <p className="font-medium text-sm truncate">{asesoria.tesis.titulo}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {asesoria.tesis.carreraNombre}
                                  </p>
                                  {/* Tesista en movil */}
                                  <div className="md:hidden mt-1">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {primerTesista
                                        ? `${primerTesista.user.apellidoPaterno} ${primerTesista.user.apellidoMaterno}`
                                        : '-'}
                                      {tesistasExtra > 0 && (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                                          +{tesistasExtra}
                                        </Badge>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Tesista (desktop) - solo el primero */}
                              <TableCell className="hidden md:table-cell">
                                {primerTesista ? (
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <p className="text-sm">
                                        {primerTesista.user.apellidoPaterno} {primerTesista.user.apellidoMaterno}, {primerTesista.user.nombres}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{primerTesista.codigoEstudiante}</p>
                                    </div>
                                    {tesistasExtra > 0 && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">
                                        +{tesistasExtra}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>

                              {/* Tipo asesor */}
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
                              <TableCell className="hidden lg:table-cell">
                                <Badge className={cn('text-xs', estadoTesis.color)}>
                                  {estadoTesis.label}
                                </Badge>
                              </TableCell>

                              {/* Estado aceptacion */}
                              <TableCell>
                                <Badge variant="outline" className={cn('text-xs gap-1', estadoAceptacion.color)}>
                                  <IconEstado className="w-3 h-3" />
                                  {estadoAceptacion.label}
                                </Badge>
                              </TableCell>

                              {/* Acciones */}
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  {asesoria.estadoAceptacion === 'PENDIENTE' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleResponder(asesoria, 'ACEPTAR')}
                                      >
                                        <Check className="w-3 h-3 mr-1" />
                                        Aceptar
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleResponder(asesoria, 'RECHAZAR')}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                  <Button variant="outline" size="sm" className="h-7 px-2" asChild>
                                    <Link href={`/mis-asesorias/${asesoria.tesisId}`}>
                                      <Eye className="w-3 h-3 mr-1" />
                                      Ver
                                    </Link>
                                  </Button>
                                </div>
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
                      asesoria={asesoriasPage.find((a) => a.id === expandedId)!}
                      onClose={() => setExpandedId(null)}
                    />
                  )}

                  {/* Paginacion */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Filas por pagina</span>
                        <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
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
                        Mostrando {startItem} - {endItem} de {asesoriasFiltered.length}
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
                {accion === 'ACEPTAR' ? 'Aceptar Asesoria' : 'Rechazar Asesoria'}
              </DialogTitle>
              <DialogDescription>
                {accion === 'ACEPTAR'
                  ? `¿Estas seguro de que deseas ser ${selectedAsesoria?.tipoAsesor === 'ASESOR' ? 'asesor' : 'coasesor'} de este proyecto de tesis?`
                  : `¿Estas seguro de que deseas rechazar ser ${selectedAsesoria?.tipoAsesor === 'ASESOR' ? 'asesor' : 'coasesor'} de este proyecto?`}
              </DialogDescription>
            </DialogHeader>

            {selectedAsesoria && (
              <div className="py-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-medium line-clamp-2">{selectedAsesoria.tesis.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    Codigo: {selectedAsesoria.tesis.codigo}
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
                      El estudiante debera buscar otro {selectedAsesoria.tipoAsesor === 'ASESOR' ? 'asesor' : 'coasesor'}.
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
    </div>
  )
}

// Detalle expandido debajo de la tabla
function ExpandedDetail({ asesoria, onClose }: { asesoria: Asesoria; onClose: () => void }) {
  if (!asesoria) return null

  const estadoTesis = ESTADO_TESIS_CONFIG[asesoria.tesis.estado] || ESTADO_TESIS_CONFIG.BORRADOR

  return (
    <div className="border-t bg-muted/30 px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Detalle de la asesoria</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tesistas */}
        <div className="col-span-full">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Tesistas</p>
          <div className="flex flex-wrap gap-3">
            {asesoria.tesistas.map((t) => (
              <div key={t.id} className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {t.user.apellidoPaterno} {t.user.apellidoMaterno}, {t.user.nombres}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'Autor principal' : 'Coautor'} • {t.codigoEstudiante}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info adicional */}
        <div className="bg-background border rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">Carrera</p>
          <p className="text-sm font-medium">{asesoria.tesis.carreraNombre}</p>
        </div>
        <div className="bg-background border rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">Facultad</p>
          <p className="text-sm font-medium">{asesoria.tesis.facultad.nombre}</p>
        </div>
        <div className="bg-background border rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">Estado de la tesis</p>
          <Badge className={cn('text-xs mt-1', estadoTesis.color)}>{estadoTesis.label}</Badge>
        </div>

        {/* Documentos */}
        <div className="col-span-full bg-background border rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground mb-2">Documentos</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('text-xs', asesoria.documentos.tieneProyecto ? 'border-green-500 text-green-600' : 'border-muted text-muted-foreground')}>
              {asesoria.documentos.tieneProyecto ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              Proyecto
            </Badge>
            <Badge variant="outline" className={cn('text-xs', asesoria.documentos.tieneCartaAsesor ? 'border-green-500 text-green-600' : 'border-muted text-muted-foreground')}>
              {asesoria.documentos.tieneCartaAsesor ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              Carta Asesor
            </Badge>
            <Badge variant="outline" className={cn('text-xs', asesoria.documentos.tieneCartaCoasesor ? 'border-green-500 text-green-600' : 'border-muted text-muted-foreground')}>
              {asesoria.documentos.tieneCartaCoasesor ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              Carta Coasesor
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
