'use client'

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
  Users,
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
  MoreHorizontal,
  Plus,
  Filter,
} from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

// Datos de ejemplo para los gráficos
const activityData = [
  { month: 'Ene', tesis: 4, aprobadas: 2 },
  { month: 'Feb', tesis: 6, aprobadas: 4 },
  { month: 'Mar', tesis: 8, aprobadas: 5 },
  { month: 'Abr', tesis: 12, aprobadas: 8 },
  { month: 'May', tesis: 10, aprobadas: 7 },
  { month: 'Jun', tesis: 15, aprobadas: 10 },
]

const tesisPorFacultad = [
  { name: 'Ingeniería', value: 45, color: '#3b82f6' },
  { name: 'Educación', value: 30, color: '#10b981' },
  { name: 'Empresariales', value: 25, color: '#f59e0b' },
]

const tesisRecientes = [
  {
    id: 1,
    titulo: 'Sistema de gestión académica usando IA',
    estudiante: 'Juan Pérez García',
    estado: 'En revisión',
    progreso: 75,
    facultad: 'Ingeniería',
  },
  {
    id: 2,
    titulo: 'Análisis de metodologías educativas',
    estudiante: 'María López Torres',
    estado: 'Aprobado',
    progreso: 100,
    facultad: 'Educación',
  },
  {
    id: 3,
    titulo: 'Estrategias de marketing digital',
    estudiante: 'Carlos Ruiz Mendoza',
    estado: 'En desarrollo',
    progreso: 45,
    facultad: 'Empresariales',
  },
  {
    id: 4,
    titulo: 'Impacto ambiental en la región',
    estudiante: 'Ana Flores Quispe',
    estado: 'Pendiente',
    progreso: 20,
    facultad: 'Ingeniería',
  },
]

const actividadReciente = [
  { accion: 'Nueva tesis registrada', usuario: 'Juan Pérez', tiempo: 'Hace 5 min', tipo: 'crear' },
  { accion: 'Documento firmado', usuario: 'Dr. García', tiempo: 'Hace 15 min', tipo: 'firma' },
  { accion: 'Tesis aprobada', usuario: 'Comité', tiempo: 'Hace 1 hora', tipo: 'aprobar' },
  { accion: 'Nuevo usuario registrado', usuario: 'María López', tiempo: 'Hace 2 horas', tipo: 'usuario' },
  { accion: 'Observación agregada', usuario: 'Dr. Mendoza', tiempo: 'Hace 3 horas', tipo: 'comentar' },
]

const chartConfig = {
  tesis: {
    label: 'Tesis Registradas',
    color: '#3b82f6',
  },
  aprobadas: {
    label: 'Tesis Aprobadas',
    color: '#10b981',
  },
}

export default function DashboardPage() {
  const { user } = useAuth()

  const nombreCompleto = user
    ? `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`
    : ''

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Aprobado':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">{estado}</Badge>
      case 'En revisión':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">{estado}</Badge>
      case 'En desarrollo':
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">{estado}</Badge>
      case 'Pendiente':
        return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">{estado}</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header de bienvenida */}
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
        <div className="flex gap-2">
          <PermissionGuard moduleCode="tesis" action="create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Tesis
            </Button>
          </PermissionGuard>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>
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
            <div className="text-2xl font-bold">127</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+12%</span>
              <span className="ml-1">vs mes anterior</span>
            </div>
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
            <div className="text-2xl font-bold">89</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+8%</span>
              <span className="ml-1">vs mes anterior</span>
            </div>
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
            <div className="text-2xl font-bold">32</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-red-500 font-medium">-3%</span>
              <span className="ml-1">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos Firmados
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <FileCheck className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">256</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+24%</span>
              <span className="ml-1">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-7 overflow-hidden">
        {/* Gráfico de barras */}
        <Card className="md:col-span-4 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              Actividad de Tesis
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Registro y aprobación de tesis en los últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <ChartContainer config={chartConfig} className="h-[200px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tesis" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aprobadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico circular */}
        <Card className="md:col-span-3 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              Tesis por Facultad
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Distribución actual de tesis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
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
                    <span className="text-xs sm:text-sm">{item.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de contenido */}
      <Tabs defaultValue="tesis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="tesis">Tesis Recientes</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>

        {/* Tab: Tesis Recientes */}
        <TabsContent value="tesis" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tesis Recientes</CardTitle>
                  <CardDescription>
                    Últimas tesis registradas en el sistema
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Ver todas
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Vista de tabla para desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Facultad</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tesisRecientes.map((tesis) => (
                      <TableRow key={tesis.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {tesis.titulo}
                        </TableCell>
                        <TableCell>{tesis.estudiante}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tesis.facultad}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={tesis.progreso} className="w-[60px] h-2" />
                            <span className="text-xs text-muted-foreground">
                              {tesis.progreso}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(tesis.estado)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista de cards para móvil */}
              <div className="md:hidden space-y-3">
                {tesisRecientes.map((tesis) => (
                  <div
                    key={tesis.id}
                    className="p-4 rounded-lg border bg-card space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{tesis.titulo}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{tesis.estudiante}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs">{tesis.facultad}</Badge>
                      {getEstadoBadge(tesis.estado)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={tesis.progreso} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {tesis.progreso}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Actividad */}
        <TabsContent value="actividad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas acciones realizadas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {actividadReciente.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      item.tipo === 'crear' ? 'bg-blue-500/10' :
                      item.tipo === 'firma' ? 'bg-purple-500/10' :
                      item.tipo === 'aprobar' ? 'bg-green-500/10' :
                      item.tipo === 'usuario' ? 'bg-yellow-500/10' :
                      'bg-gray-500/10'
                    }`}>
                      {item.tipo === 'crear' && <FileText className="h-5 w-5 text-blue-500" />}
                      {item.tipo === 'firma' && <FileCheck className="h-5 w-5 text-purple-500" />}
                      {item.tipo === 'aprobar' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {item.tipo === 'usuario' && <Users className="h-5 w-5 text-yellow-500" />}
                      {item.tipo === 'comentar' && <AlertCircle className="h-5 w-5 text-gray-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.accion}</p>
                      <p className="text-xs text-muted-foreground">por {item.usuario}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.tiempo}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Calendario */}
        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximos Eventos
              </CardTitle>
              <CardDescription>
                Sustentaciones y fechas importantes programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">15</div>
                    <div className="text-xs text-muted-foreground">ENE</div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Sustentación de Tesis</p>
                    <p className="text-sm text-muted-foreground">Juan Pérez - Ing. Sistemas</p>
                  </div>
                  <Badge>10:00 AM</Badge>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">18</div>
                    <div className="text-xs text-muted-foreground">ENE</div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Revisión de Avances</p>
                    <p className="text-sm text-muted-foreground">Comité de Tesis - Educación</p>
                  </div>
                  <Badge>2:00 PM</Badge>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">22</div>
                    <div className="text-xs text-muted-foreground">ENE</div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Capacitación Asesores</p>
                    <p className="text-sm text-muted-foreground">Todas las facultades</p>
                  </div>
                  <Badge>9:00 AM</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Stats Footer */}
      <PermissionGuard moduleCode="reportes" action="view">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Promedio de Aprobación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85.3%</div>
              <Progress value={85.3} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8.5 meses</div>
              <p className="text-xs text-muted-foreground mt-2">
                Desde registro hasta aprobación
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Satisfacción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.8/5.0</div>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-4 w-4 ${star <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    </div>
  )
}
