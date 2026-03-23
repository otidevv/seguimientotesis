'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  GraduationCap,
  Calendar,
  Eye,
  Search,
  ArrowRight,
  Sparkles,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

interface Autor {
  id: string
  tipoParticipante: string
  user: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
  }
}

interface Asesor {
  id: string
  tipoAsesor: string
  estado: string
  user: {
    id: string
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
  }
}

interface Tesis {
  id: string
  codigo: string
  titulo: string
  estado: string
  carreraNombre: string
  createdAt: string
  fechaRegistro: string | null
  autores: Autor[]
  asesores: Asesor[]
  facultad: {
    nombre: string
  }
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgLight: string; border: string; icon: React.ReactNode; step: number }> = {
  BORRADOR: { label: 'Borrador', color: 'bg-gray-500', bgLight: 'bg-gray-50 dark:bg-gray-950/30', border: 'border-l-gray-400', icon: <FileText className="w-3.5 h-3.5" />, step: 1 },
  EN_REVISION: { label: 'Proyecto en Revisión', color: 'bg-blue-500', bgLight: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-l-blue-500', icon: <Clock className="w-3.5 h-3.5" />, step: 2 },
  OBSERVADA: { label: 'Observada', color: 'bg-orange-500', bgLight: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-l-orange-500', icon: <AlertCircle className="w-3.5 h-3.5" />, step: 2 },
  APROBADA: { label: 'Proyecto Aprobado', color: 'bg-green-500', bgLight: 'bg-green-50 dark:bg-green-950/30', border: 'border-l-green-500', icon: <CheckCircle className="w-3.5 h-3.5" />, step: 4 },
  EN_SUSTENTACION: { label: 'En Sustentación', color: 'bg-purple-500', bgLight: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-l-purple-500', icon: <Calendar className="w-3.5 h-3.5" />, step: 6 },
  SUSTENTADA: { label: 'Sustentada', color: 'bg-emerald-600', bgLight: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-l-emerald-600', icon: <GraduationCap className="w-3.5 h-3.5" />, step: 7 },
  ARCHIVADA: { label: 'Archivada', color: 'bg-slate-500', bgLight: 'bg-slate-50 dark:bg-slate-950/30', border: 'border-l-slate-500', icon: <FileText className="w-3.5 h-3.5" />, step: 7 },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-500', bgLight: 'bg-red-50 dark:bg-red-950/30', border: 'border-l-red-500', icon: <AlertCircle className="w-3.5 h-3.5" />, step: 0 },
  ASIGNANDO_JURADOS: { label: 'Asignando Jurados', color: 'bg-purple-500', bgLight: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-l-purple-500', icon: <Clock className="w-3.5 h-3.5" />, step: 3 },
  EN_EVALUACION_JURADO: { label: 'En Evaluación', color: 'bg-indigo-500', bgLight: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-l-indigo-500', icon: <Clock className="w-3.5 h-3.5" />, step: 3 },
  OBSERVADA_JURADO: { label: 'Observada por Jurado', color: 'bg-orange-500', bgLight: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-l-orange-500', icon: <AlertCircle className="w-3.5 h-3.5" />, step: 3 },
  PROYECTO_APROBADO: { label: 'Proyecto Aprobado', color: 'bg-green-500', bgLight: 'bg-green-50 dark:bg-green-950/30', border: 'border-l-green-500', icon: <CheckCircle className="w-3.5 h-3.5" />, step: 4 },
  INFORME_FINAL: { label: 'Informe Final', color: 'bg-cyan-500', bgLight: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-l-cyan-500', icon: <FileText className="w-3.5 h-3.5" />, step: 5 },
  EN_REVISION_INFORME: { label: 'Informe en Revisión', color: 'bg-blue-500', bgLight: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-l-blue-500', icon: <Clock className="w-3.5 h-3.5" />, step: 5 },
  EN_EVALUACION_INFORME: { label: 'Evaluando Informe', color: 'bg-indigo-500', bgLight: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-l-indigo-500', icon: <Clock className="w-3.5 h-3.5" />, step: 5 },
  OBSERVADA_INFORME: { label: 'Informe Observado', color: 'bg-orange-500', bgLight: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-l-orange-500', icon: <AlertCircle className="w-3.5 h-3.5" />, step: 5 },
  REGISTRO_PENDIENTE: { label: 'Proyecto en Revisión', color: 'bg-blue-500', bgLight: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-l-blue-500', icon: <Clock className="w-3.5 h-3.5" />, step: 2 },
  PROYECTO_OBSERVADO: { label: 'Observada', color: 'bg-orange-500', bgLight: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-l-orange-500', icon: <AlertCircle className="w-3.5 h-3.5" />, step: 2 },
}

const MAX_STEPS = 7

function TesisCardSkeleton({ index }: { index: number }) {
  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards border-l-4 border-l-muted"
      style={{ animationDelay: `${index * 100}ms`, animationDuration: '500ms' }}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex gap-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: string
  index: number
}) {
  return (
    <Card
      className="animate-in fade-in zoom-in-95 fill-mode-backwards hover:shadow-md transition-shadow duration-300"
      style={{ animationDelay: `${index * 80}ms`, animationDuration: '500ms' }}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${color} shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MisTesisPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole } = useAuth()
  const [tesis, setTesis] = useState<Tesis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      loadTesis()
    }
  }, [authLoading, user])

  const loadTesis = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tesis')
      const data = await response.json()

      if (data.success) {
        setTesis(data.data)
      } else {
        setError(data.error || 'Error al cargar tesis')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = tesis.length
    const enProgreso = tesis.filter(t =>
      ['EN_REVISION', 'REGISTRO_PENDIENTE', 'EN_EVALUACION_JURADO', 'ASIGNANDO_JURADOS', 'EN_REVISION_INFORME', 'EN_EVALUACION_INFORME', 'INFORME_FINAL'].includes(t.estado)
    ).length
    const aprobadas = tesis.filter(t =>
      ['APROBADA', 'PROYECTO_APROBADO', 'SUSTENTADA'].includes(t.estado)
    ).length
    const observadas = tesis.filter(t =>
      ['OBSERVADA', 'OBSERVADA_JURADO', 'OBSERVADA_INFORME', 'PROYECTO_OBSERVADO'].includes(t.estado)
    ).length
    return { total, enProgreso, aprobadas, observadas }
  }, [tesis])

  const filteredTesis = useMemo(() => {
    let result = tesis
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.titulo.toLowerCase().includes(q) ||
        t.codigo.toLowerCase().includes(q) ||
        t.carreraNombre.toLowerCase().includes(q)
      )
    }
    if (activeFilter) {
      if (activeFilter === 'progreso') {
        result = result.filter(t =>
          ['EN_REVISION', 'REGISTRO_PENDIENTE', 'EN_EVALUACION_JURADO', 'ASIGNANDO_JURADOS', 'EN_REVISION_INFORME', 'EN_EVALUACION_INFORME', 'INFORME_FINAL'].includes(t.estado)
        )
      } else if (activeFilter === 'aprobadas') {
        result = result.filter(t =>
          ['APROBADA', 'PROYECTO_APROBADO', 'SUSTENTADA'].includes(t.estado)
        )
      } else if (activeFilter === 'observadas') {
        result = result.filter(t =>
          ['OBSERVADA', 'OBSERVADA_JURADO', 'OBSERVADA_INFORME', 'PROYECTO_OBSERVADO'].includes(t.estado)
        )
      }
    }
    return result
  }, [tesis, searchQuery, activeFilter])

  if (authLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          {[0, 1, 2].map(i => (
            <TesisCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!hasRole('ESTUDIANTE')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-500">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Esta sección es solo para estudiantes.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header animado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              Mis Tesis
            </h1>
            <p className="text-muted-foreground mt-1 ml-[52px]">
              Gestiona tus proyectos de tesis
            </p>
          </div>
          <Button asChild className="animate-in fade-in zoom-in-95 duration-500 delay-200 fill-mode-backwards shadow-md hover:shadow-lg transition-shadow">
            <Link href="/mis-tesis/nuevo">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proyecto
            </Link>
          </Button>
        </div>

        {/* Stats resumen */}
        {!loading && tesis.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={BookOpen} label="Total de tesis" value={stats.total} color="bg-primary" index={0} />
            <StatCard icon={TrendingUp} label="En progreso" value={stats.enProgreso} color="bg-blue-500" index={1} />
            <StatCard icon={CheckCircle} label="Aprobadas" value={stats.aprobadas} color="bg-green-500" index={2} />
            <StatCard icon={AlertCircle} label="Observadas" value={stats.observadas} color="bg-orange-500" index={3} />
          </div>
        )}

        {/* Barra de búsqueda y filtros */}
        {!loading && tesis.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-backwards">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, código o carrera..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: null, label: 'Todos' },
                { key: 'progreso', label: 'En progreso' },
                { key: 'aprobadas', label: 'Aprobadas' },
                { key: 'observadas', label: 'Observadas' },
              ].map((filter) => (
                <Button
                  key={filter.key ?? 'all'}
                  variant={activeFilter === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter(filter.key)}
                  className="transition-all duration-200"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 animate-in fade-in shake-x duration-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <TesisCardSkeleton key={i} index={i} />
            ))}
          </div>
        )}

        {/* Estado vacío */}
        {!loading && tesis.length === 0 && (
          <Card className="animate-in fade-in zoom-in-95 duration-700">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <FileText className="w-10 h-10 text-primary/60" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">No tienes proyectos de tesis</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Comienza registrando tu proyecto de tesis para dar seguimiento a todo el proceso académico
              </p>
              <Button asChild size="lg" className="shadow-md">
                <Link href="/mis-tesis/nuevo">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Proyecto
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sin resultados de búsqueda */}
        {!loading && tesis.length > 0 && filteredTesis.length === 0 && (
          <Card className="animate-in fade-in duration-300">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Sin resultados</h3>
              <p className="text-muted-foreground text-sm">
                No se encontraron tesis que coincidan con tu búsqueda
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lista de tesis */}
        {!loading && filteredTesis.length > 0 && (
          <div className="space-y-4">
            {filteredTesis.map((t, index) => {
              const estadoConfig = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG.BORRADOR
              const progressPercent = Math.round((estadoConfig.step / MAX_STEPS) * 100)
              const fechaCreacion = new Date(t.createdAt).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })

              return (
                <Card
                  key={t.id}
                  className={`group border-l-4 ${estadoConfig.border} hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards`}
                  style={{ animationDelay: `${index * 80}ms`, animationDuration: '500ms' }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-mono">
                            {t.codigo}
                          </Badge>
                          <Badge className={`${estadoConfig.color} text-white text-xs gap-1`}>
                            {estadoConfig.icon}
                            <span>{estadoConfig.label}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto hidden sm:flex">
                            <Calendar className="w-3 h-3" />
                            {fechaCreacion}
                          </span>
                        </div>
                        <CardTitle className="text-base sm:text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
                          {t.titulo}
                        </CardTitle>
                        <CardDescription>
                          {t.carreraNombre} &bull; {t.facultad.nombre}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200 shrink-0"
                      >
                        <Link href={`/mis-tesis/${t.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          Ver detalle
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground shrink-0">{t.autores.length > 1 ? 'Tesistas:' : 'Tesista:'}</span>
                        <span className="truncate">
                          {t.autores
                            .map((a) => `${a.user.apellidoPaterno} ${a.user.apellidoMaterno}, ${a.user.nombres}`)
                            .join(' & ')}
                        </span>
                      </div>
                      {t.asesores.filter(a => a.tipoAsesor === 'ASESOR').length > 0 && (
                        <div className="flex items-center gap-2 min-w-0">
                          <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground shrink-0">Asesor:</span>
                          <span className="truncate">
                            {t.asesores
                              .filter((a) => a.tipoAsesor === 'ASESOR')
                              .map((a) => `${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Barra de progreso */}
                    <div className="flex items-center gap-3">
                      <Progress value={progressPercent} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground font-medium tabular-nums w-9 text-right">
                        {progressPercent}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
