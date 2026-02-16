'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PermissionGuard } from '@/components/auth'
import {
  BookOpen,
  FileCheck,
  Clock,
  TrendingUp,
  Calendar,
  GraduationCap,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Inbox,
  RefreshCw,
  Eye,
  Gavel,
} from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Mapeo de estado a progreso visual
const PROGRESO_POR_ESTADO: Record<string, number> = {
  BORRADOR: 5,
  EN_REVISION: 15,
  OBSERVADA: 20,
  ASIGNANDO_JURADOS: 30,
  EN_EVALUACION_JURADO: 40,
  OBSERVADA_JURADO: 45,
  PROYECTO_APROBADO: 55,
  INFORME_FINAL: 60,
  EN_EVALUACION_INFORME: 70,
  OBSERVADA_INFORME: 75,
  APROBADA: 85,
  EN_SUSTENTACION: 90,
  SUSTENTADA: 100,
  ARCHIVADA: 100,
  RECHAZADA: 0,
}

const ESTADO_LABEL: Record<string, { label: string; color: string; bgColor: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  EN_REVISION: { label: 'En Revision', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  OBSERVADA: { label: 'Observada', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  ASIGNANDO_JURADOS: { label: 'Asign. Jurados', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  EN_EVALUACION_JURADO: { label: 'Eval. Jurado', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  OBSERVADA_JURADO: { label: 'Obs. Jurado', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  PROYECTO_APROBADO: { label: 'Proy. Aprobado', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  INFORME_FINAL: { label: 'Informe Final', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  EN_EVALUACION_INFORME: { label: 'Eval. Informe', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  OBSERVADA_INFORME: { label: 'Obs. Informe', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  APROBADA: { label: 'Aprobada', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  EN_SUSTENTACION: { label: 'En Sustentacion', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  SUSTENTADA: { label: 'Sustentada', color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
  ARCHIVADA: { label: 'Archivada', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  RECHAZADA: { label: 'Rechazada', color: 'text-red-500', bgColor: 'bg-red-500/10' },
}

function tiempoRelativo(fecha: string): string {
  const ahora = new Date()
  const date = new Date(fecha)
  const diff = ahora.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Hace un momento'
  if (mins < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days < 7) return `Hace ${days}d`
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

function getAccionTexto(estadoNuevo: string, estadoAnterior: string | null): string {
  if (!estadoAnterior) return 'Tesis registrada'
  if (estadoNuevo === 'EN_REVISION' && estadoAnterior === 'BORRADOR') return 'Tesis enviada a revision'
  if (estadoNuevo === 'APROBADA') return 'Tesis aprobada'
  if (estadoNuevo === 'PROYECTO_APROBADO') return 'Proyecto aprobado'
  if (estadoNuevo === 'RECHAZADA') return 'Tesis rechazada'
  if (['OBSERVADA', 'OBSERVADA_JURADO', 'OBSERVADA_INFORME'].includes(estadoNuevo)) return 'Tesis observada'
  if (estadoNuevo === 'ASIGNANDO_JURADOS') return 'Documentos aprobados'
  if (estadoNuevo === 'EN_SUSTENTACION') return 'Tesis lista para sustentacion'
  if (estadoNuevo === 'SUSTENTADA') return 'Tesis sustentada'
  const label = ESTADO_LABEL[estadoNuevo]?.label || estadoNuevo
  return `Cambio a ${label}`
}

function getTipoActividad(estadoNuevo: string, estadoAnterior: string | null) {
  if (!estadoAnterior || (estadoAnterior === 'BORRADOR' && estadoNuevo === 'EN_REVISION')) return 'crear'
  if (['APROBADA', 'PROYECTO_APROBADO', 'ASIGNANDO_JURADOS'].includes(estadoNuevo)) return 'aprobar'
  if (['OBSERVADA', 'OBSERVADA_JURADO', 'OBSERVADA_INFORME'].includes(estadoNuevo)) return 'observar'
  if (estadoNuevo === 'RECHAZADA') return 'rechazar'
  return 'cambio'
}

interface DashboardData {
  stats: {
    totalTesis: number
    aprobadas: number
    enProceso: number
    documentos: number
    tendencias: { tesis: number; aprobadas: number; documentos: number }
  }
  actividadMensual: { month: string; registradas: number; actualizadas: number }[]
  tesisPorFacultad: { name: string; value: number; color: string }[]
  tesisRecientes: {
    id: string
    titulo: string
    estado: string
    estudiante: string
    facultad: string
    fechaCreacion: string
  }[]
  actividadReciente: {
    estadoAnterior: string | null
    estadoNuevo: string
    comentario: string | null
    usuario: string
    tesis: string
    fecha: string
  }[]
  proximosEventos: {
    id: string
    titulo: string
    estado: string
    fecha: string
    estudiante: string
    carrera: string
  }[]
  statsAvanzados: {
    tasaAprobacion: number
    tiempoPromedioMeses: number
    tesisEsteMes: number
  }
}

const chartConfig = {
  registradas: { label: 'Nuevas', color: '#3b82f6' },
  actualizadas: { label: 'Con actividad', color: '#10b981' },
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboard()
    }
  }, [authLoading, user, loadDashboard])

  const nombreCompleto = user
    ? `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`
    : ''

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Error al cargar el dashboard</p>
        <Button variant="outline" onClick={loadDashboard}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  const { stats, actividadMensual, tesisPorFacultad, tesisRecientes, actividadReciente, proximosEventos, statsAvanzados } = data
  const totalFacultad = tesisPorFacultad.reduce((sum, f) => sum + f.value, 0)

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Bienvenido, {user?.nombres}
          </h1>
          <p className="text-muted-foreground mt-1">
            {nombreCompleto}
          </p>
          <div className="flex gap-2 mt-3">
            {user?.roles.map((role) => (
              <Badge
                key={role.id}
                style={{ backgroundColor: role.color || '#6b7280' }}
                className="text-white"
              >
                {role.nombre}
              </Badge>
            ))}
          </div>
        </div>
        <PermissionGuard moduleCode="tesis" action="create">
          <Button asChild>
            <Link href="/mis-tesis">
              <BookOpen className="mr-2 h-4 w-4" />
              Mis Tesis
            </Link>
          </Button>
        </PermissionGuard>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tesis
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTesis}</div>
            <TendenciaIndicador valor={stats.tendencias.tesis} />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprobadas
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aprobadas}</div>
            <TendenciaIndicador valor={stats.tendencias.aprobadas} />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En Proceso
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enProceso}</div>
            <p className="text-xs text-muted-foreground mt-1">tesis activas en revision</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <FileCheck className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentos}</div>
            <TendenciaIndicador valor={stats.tendencias.documentos} />
          </CardContent>
        </Card>
      </div>

      {/* Graficos */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-7 overflow-hidden">
        {/* Grafico de barras */}
        <Card className="md:col-span-4 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              Actividad de Tesis
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Nuevas tesis y tesis con actividad en los ultimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            {actividadMensual.some((m) => m.registradas > 0 || m.actualizadas > 0) ? (
              <ChartContainer config={chartConfig} className="h-[200px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actividadMensual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="registradas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actualizadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[200px] sm:h-[300px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin datos en los ultimos 6 meses</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grafico circular */}
        <Card className="md:col-span-3 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              Tesis por Facultad
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Distribucion actual de tesis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            {tesisPorFacultad.length > 0 ? (
              <>
                <div className="h-[180px] sm:h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tesisPorFacultad}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {tesisPorFacultad.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {tesisPorFacultad.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs sm:text-sm truncate max-w-[150px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium">{item.value}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({totalFacultad > 0 ? Math.round((item.value / totalFacultad) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin datos de facultades</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tesis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="tesis">Tesis Recientes</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
          <TabsTrigger value="calendario">Eventos</TabsTrigger>
        </TabsList>

        {/* Tab: Tesis Recientes */}
        <TabsContent value="tesis" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tesis Recientes</CardTitle>
                  <CardDescription>
                    Ultimas tesis registradas en el sistema
                  </CardDescription>
                </div>
                <PermissionGuard moduleCode="reportes" action="view">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/reportes">
                      Ver todas
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </PermissionGuard>
              </div>
            </CardHeader>
            <CardContent>
              {tesisRecientes.length === 0 ? (
                <div className="py-8 text-center">
                  <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay tesis registradas</p>
                </div>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Titulo</TableHead>
                          <TableHead>Estudiante</TableHead>
                          <TableHead>Facultad</TableHead>
                          <TableHead>Progreso</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tesisRecientes.map((tesis) => {
                          const estadoInfo = ESTADO_LABEL[tesis.estado]
                          const progreso = PROGRESO_POR_ESTADO[tesis.estado] ?? 0
                          return (
                            <TableRow key={tesis.id}>
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {tesis.titulo}
                              </TableCell>
                              <TableCell className="text-sm">{tesis.estudiante}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{tesis.facultad}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={progreso} className="w-[60px] h-2" />
                                  <span className="text-xs text-muted-foreground">
                                    {progreso}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn(estadoInfo?.bgColor, estadoInfo?.color, 'hover:opacity-80')}>
                                  {estadoInfo?.label || tesis.estado}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" asChild>
                                  <Link href={`/mesa-partes/${tesis.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden space-y-3">
                    {tesisRecientes.map((tesis) => {
                      const estadoInfo = ESTADO_LABEL[tesis.estado]
                      const progreso = PROGRESO_POR_ESTADO[tesis.estado] ?? 0
                      return (
                        <Link
                          key={tesis.id}
                          href={`/mesa-partes/${tesis.id}`}
                          className="block p-4 rounded-lg border bg-card space-y-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2">{tesis.titulo}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{tesis.estudiante}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-xs">{tesis.facultad}</Badge>
                            <Badge className={cn(estadoInfo?.bgColor, estadoInfo?.color, 'hover:opacity-80')}>
                              {estadoInfo?.label || tesis.estado}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={progreso} className="flex-1 h-2" />
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {progreso}%
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Actividad */}
        <TabsContent value="actividad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Ultimas acciones realizadas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actividadReciente.length === 0 ? (
                <div className="py-8 text-center">
                  <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {actividadReciente.map((item, index) => {
                    const tipo = getTipoActividad(item.estadoNuevo, item.estadoAnterior)
                    const accion = getAccionTexto(item.estadoNuevo, item.estadoAnterior)
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                          tipo === 'crear' && 'bg-blue-500/10',
                          tipo === 'aprobar' && 'bg-green-500/10',
                          tipo === 'observar' && 'bg-orange-500/10',
                          tipo === 'rechazar' && 'bg-red-500/10',
                          tipo === 'cambio' && 'bg-gray-500/10',
                        )}>
                          {tipo === 'crear' && <FileText className="h-5 w-5 text-blue-500" />}
                          {tipo === 'aprobar' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                          {tipo === 'observar' && <AlertCircle className="h-5 w-5 text-orange-500" />}
                          {tipo === 'rechazar' && <AlertCircle className="h-5 w-5 text-red-500" />}
                          {tipo === 'cambio' && <RefreshCw className="h-5 w-5 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{accion}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            por {item.usuario} - {item.tesis}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {tiempoRelativo(item.fecha)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Eventos */}
        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tesis en Fase Final
              </CardTitle>
              <CardDescription>
                Tesis aprobadas y en proceso de sustentacion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proximosEventos.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay tesis en fase final actualmente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proximosEventos.map((evento) => {
                    const fecha = new Date(evento.fecha)
                    const esAprobada = evento.estado === 'APROBADA'
                    return (
                      <Link
                        key={evento.id}
                        href={`/mesa-partes/${evento.id}`}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50',
                          esAprobada ? 'bg-green-500/5 border-green-500/20' : 'bg-violet-500/5 border-violet-500/20'
                        )}
                      >
                        <div className="text-center flex-shrink-0">
                          <div className={cn('text-2xl font-bold', esAprobada ? 'text-green-500' : 'text-violet-500')}>
                            {fecha.getDate()}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {fecha.toLocaleDateString('es-PE', { month: 'short' })}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {esAprobada ? 'Pendiente de Sustentacion' : 'En Sustentacion'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {evento.estudiante} - {evento.carrera}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn(
                          esAprobada ? 'text-green-600 border-green-300' : 'text-violet-600 border-violet-300'
                        )}>
                          {esAprobada ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Gavel className="w-3 h-3 mr-1" />}
                          {esAprobada ? 'Aprobada' : 'Sustentacion'}
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Footer */}
      <PermissionGuard moduleCode="reportes" action="view">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Aprobacion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsAvanzados.tasaAprobacion}%</div>
              <Progress value={statsAvanzados.tasaAprobacion} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsAvanzados.tiempoPromedioMeses > 0
                  ? `${statsAvanzados.tiempoPromedioMeses} meses`
                  : 'Sin datos'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Desde registro hasta aprobacion
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tesis este Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsAvanzados.tesisEsteMes}</div>
              <p className="text-xs text-muted-foreground mt-2">
                nuevas tesis registradas
              </p>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    </div>
  )
}

function TendenciaIndicador({ valor }: { valor: number }) {
  if (valor === 0) {
    return (
      <p className="text-xs text-muted-foreground mt-1">sin cambios vs mes anterior</p>
    )
  }
  const positivo = valor > 0
  return (
    <div className="flex items-center text-xs text-muted-foreground mt-1">
      {positivo ? (
        <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
      ) : (
        <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
      )}
      <span className={cn('font-medium', positivo ? 'text-green-500' : 'text-red-500')}>
        {positivo ? '+' : ''}{valor}%
      </span>
      <span className="ml-1">vs mes anterior</span>
    </div>
  )
}
