'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PermissionGuard } from '@/components/auth'
import {
  Calendar, FileText, CheckCircle2, AlertCircle, ArrowUpRight,
  Inbox, RefreshCw, Eye, Gavel,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ESTADO_LABEL, PROGRESO_POR_ESTADO,
  tiempoRelativo, getAccionTexto, getTipoActividad,
} from './constants'
import type { DashboardData } from './constants'

interface RecentTabsProps {
  tesisRecientes: DashboardData['tesisRecientes']
  actividadReciente: DashboardData['actividadReciente']
  proximosEventos: DashboardData['proximosEventos']
}

export function RecentTabs({ tesisRecientes, actividadReciente, proximosEventos }: RecentTabsProps) {
  return (
    <Tabs defaultValue="tesis" className="space-y-4 animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards" style={{ animationDelay: '480ms', animationDuration: '500ms' }}>
      <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
        <TabsTrigger value="tesis">Tesis Recientes</TabsTrigger>
        <TabsTrigger value="actividad">Actividad</TabsTrigger>
        <TabsTrigger value="calendario">Eventos</TabsTrigger>
      </TabsList>

      <TabsContent value="tesis" className="space-y-4">
        <TesisRecientesTab data={tesisRecientes} />
      </TabsContent>

      <TabsContent value="actividad" className="space-y-4">
        <ActividadTab data={actividadReciente} />
      </TabsContent>

      <TabsContent value="calendario" className="space-y-4">
        <EventosTab data={proximosEventos} />
      </TabsContent>
    </Tabs>
  )
}

function TesisRecientesTab({ data }: { data: DashboardData['tesisRecientes'] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tesis Recientes</CardTitle>
            <CardDescription>Ultimas tesis registradas en el sistema</CardDescription>
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
        {data.length === 0 ? (
          <EmptyState icon={<Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />} text="No hay tesis registradas" />
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
                  {data.map((tesis) => {
                    const estadoInfo = ESTADO_LABEL[tesis.estado]
                    const progreso = PROGRESO_POR_ESTADO[tesis.estado] ?? 0
                    return (
                      <TableRow key={tesis.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{tesis.titulo}</TableCell>
                        <TableCell className="text-sm">{tesis.estudiante}</TableCell>
                        <TableCell><Badge variant="outline">{tesis.facultad}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={progreso} className="w-[60px] h-2" />
                            <span className="text-xs text-muted-foreground">{progreso}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(estadoInfo?.bgColor, estadoInfo?.color, 'hover:opacity-80')}>
                            {estadoInfo?.label || tesis.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/mesa-partes/${tesis.id}`}><Eye className="h-4 w-4" /></Link>
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
              {data.map((tesis) => {
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
                      <span className="text-xs text-muted-foreground w-10 text-right">{progreso}%</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ActividadTab({ data }: { data: DashboardData['actividadReciente'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>Ultimas acciones realizadas en el sistema</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={<Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />} text="Sin actividad reciente" />
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => {
              const tipo = getTipoActividad(item.estadoNuevo, item.estadoAnterior)
              const accion = getAccionTexto(item.estadoNuevo, item.estadoAnterior)
              return (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
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
  )
}

function EventosTab({ data }: { data: DashboardData['proximosEventos'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Tesis en Fase Final
        </CardTitle>
        <CardDescription>Tesis aprobadas y en proceso de sustentacion</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={<Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />} text="No hay tesis en fase final actualmente" />
        ) : (
          <div className="space-y-4">
            {data.map((evento) => {
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
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-8 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
