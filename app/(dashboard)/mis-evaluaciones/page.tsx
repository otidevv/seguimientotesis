'use client'

import { useState, useEffect, useCallback } from 'react'
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
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Eye,
  Loader2,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EvaluacionItem {
  id: string
  thesisId: string
  tipo: string
  fase: string
  titulo: string
  estado: string
  faseTerminada: boolean
  rondaActual: number
  faseActual: string | null
  fechaLimiteEvaluacion: string | null
  autores: string
  yaEvaluo: boolean
  miResultado: string | null
}

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20]

const TIPO_LABELS: Record<string, string> = {
  PRESIDENTE: 'Presidente',
  VOCAL: 'Vocal',
  SECRETARIO: 'Secretario',
  ACCESITARIO: 'Accesitario',
}

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  EN_EVALUACION_JURADO: { label: 'En Evaluacion', color: 'text-indigo-600 bg-indigo-100' },
  OBSERVADA_JURADO: { label: 'Observada', color: 'text-orange-600 bg-orange-100' },
  PROYECTO_APROBADO: { label: 'Proyecto Aprobado', color: 'text-green-600 bg-green-100' },
  EN_EVALUACION_INFORME: { label: 'Evaluando Informe', color: 'text-indigo-600 bg-indigo-100' },
  OBSERVADA_INFORME: { label: 'Informe Observado', color: 'text-orange-600 bg-orange-100' },
  APROBADA: { label: 'Aprobada', color: 'text-green-600 bg-green-100' },
  ASIGNANDO_JURADOS: { label: 'Asignando Jurados', color: 'text-purple-600 bg-purple-100' },
  INFORME_FINAL: { label: 'Informe Final', color: 'text-cyan-600 bg-cyan-100' },
}

const FASE_OPTIONS = [
  { value: 'TODOS', label: 'Todas las fases' },
  { value: 'PROYECTO', label: 'Proyecto' },
  { value: 'INFORME_FINAL', label: 'Informe Final' },
]

export default function MisEvaluacionesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [filtroFase, setFiltroFase] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [contadores, setContadores] = useState({ total: 0, pendientes: 0, evaluadas: 0 })

  // Debounce de busqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaDebounced(busqueda)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [busqueda])

  const loadEvaluaciones = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(itemsPerPage))
      if (filtroFase !== 'TODOS') params.set('fase', filtroFase)
      if (busquedaDebounced) params.set('busqueda', busquedaDebounced)

      const response = await fetch(`/api/mis-evaluaciones?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setEvaluaciones(data.data)
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
          setTotalItems(data.pagination.totalItems)
        }
        if (data.contadores) {
          setContadores(data.contadores)
        }
      }
    } catch {
      // Error silencioso
    } finally {
      setLoading(false)
    }
  }, [page, itemsPerPage, filtroFase, busquedaDebounced])

  useEffect(() => {
    if (!authLoading && user) {
      loadEvaluaciones()
    }
  }, [authLoading, user, loadEvaluaciones])

  const handleFiltroFase = (value: string) => {
    setPage(1)
    setFiltroFase(value)
  }

  const handleItemsPerPage = (value: string) => {
    setPage(1)
    setItemsPerPage(Number(value))
  }

  // Generar numeros de pagina visibles
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const startItem = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, totalItems)

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mis Evaluaciones</h1>
          <p className="text-muted-foreground">
            Tesis asignadas para evaluacion como jurado
          </p>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contadores.pendientes}</p>
                <p className="text-xs text-muted-foreground">Pendientes de evaluar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contadores.evaluadas}</p>
                <p className="text-xs text-muted-foreground">Evaluadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contadores.total}</p>
                <p className="text-xs text-muted-foreground">Total asignadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Tesis Asignadas</CardTitle>
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
            <Select value={filtroFase} onValueChange={handleFiltroFase}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent position="popper">
                {FASE_OPTIONS.map((opt) => (
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

              {evaluaciones.length === 0 ? (
                <div className="py-16 text-center">
                  <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <h3 className="text-base font-semibold mb-1">No hay evaluaciones</h3>
                  <p className="text-sm text-muted-foreground">
                    {busqueda
                      ? 'No se encontraron resultados para la busqueda'
                      : 'No tienes tesis asignadas para evaluacion'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tesis</TableHead>
                          <TableHead className="hidden md:table-cell">Mi Rol</TableHead>
                          <TableHead className="hidden md:table-cell">Fase</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="hidden lg:table-cell">Fecha Limite</TableHead>
                          <TableHead>Mi Evaluacion</TableHead>
                          <TableHead className="w-[80px]">Accion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evaluaciones.map((item) => {
                          const estadoConfig = ESTADO_LABELS[item.estado]
                          const puedeEvaluar = !item.faseTerminada && ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME'].includes(item.estado) && !item.yaEvaluo
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="max-w-[300px]">
                                  <p className="font-medium text-sm truncate">{item.titulo}</p>
                                  <p className="text-xs text-muted-foreground truncate">{item.autores}</p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className="text-xs">
                                  {TIPO_LABELS[item.tipo]}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-xs">
                                  {item.fase === 'PROYECTO' ? 'Proyecto' : 'Informe Final'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn('text-xs', estadoConfig?.color || 'bg-gray-100 text-gray-600')}>
                                  {estadoConfig?.label || item.estado}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {item.fechaLimiteEvaluacion ? (
                                  <span className="text-xs">
                                    {new Date(item.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.yaEvaluo || item.faseTerminada ? (
                                  <Badge variant="outline" className={cn(
                                    'text-xs',
                                    item.miResultado === 'APROBADO'
                                      ? 'border-green-500 text-green-600'
                                      : item.miResultado === 'OBSERVADO'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-green-500 text-green-600'
                                  )}>
                                    {item.miResultado === 'APROBADO' ? 'Aprobado' : item.miResultado === 'OBSERVADO' ? 'Observado' : 'Aprobado'}
                                  </Badge>
                                ) : puedeEvaluar ? (
                                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                                    Pendiente
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/mis-evaluaciones/${item.thesisId}?juradoId=${item.id}`}>
                                    <Eye className="w-3 h-3 mr-1" />
                                    Ver
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

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
      </div>
    </div>
  )
}
