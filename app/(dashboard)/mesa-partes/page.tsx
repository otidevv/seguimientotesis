'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Inbox,
  Loader2,
  Search,
  User,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Proyecto {
  id: string
  codigo: string
  titulo: string
  estado: string
  fechaEnvio: string
  autorPrincipal: {
    nombre: string
    codigo: string
    email: string
  } | null
  cantidadAutores: number
  asesor: {
    nombre: string
    estado: string
  } | null
  carrera: string
  facultad: {
    id: string
    nombre: string
    codigo: string
  } | null
  tieneProyecto: boolean
  tieneCartaAsesor: boolean
  documentosCount: number
}

interface Contadores {
  EN_REVISION: number
  OBSERVADA: number
  APROBADA: number
  RECHAZADA: number
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  EN_REVISION: {
    label: 'En Revisión',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="w-4 h-4" />,
  },
  OBSERVADA: {
    label: 'Observada',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  APROBADA: {
    label: 'Aprobada',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  RECHAZADA: {
    label: 'Rechazada',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-4 h-4" />,
  },
}

export default function MesaPartesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole } = useAuth()

  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [contadores, setContadores] = useState<Contadores>({
    EN_REVISION: 0,
    OBSERVADA: 0,
    APROBADA: 0,
    RECHAZADA: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('EN_REVISION')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      loadProyectos()
    }
  }, [authLoading, user, filtroEstado])

  const loadProyectos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mesa-partes?estado=${filtroEstado}`)
      const data = await response.json()

      if (data.success) {
        setProyectos(data.data)
        setContadores(data.contadores)
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar por búsqueda
  const proyectosFiltrados = proyectos.filter((p) => {
    if (!busqueda) return true
    const termino = busqueda.toLowerCase()
    return (
      p.titulo.toLowerCase().includes(termino) ||
      p.codigo.toLowerCase().includes(termino) ||
      p.autorPrincipal?.nombre.toLowerCase().includes(termino) ||
      p.autorPrincipal?.codigo?.toLowerCase().includes(termino) ||
      p.carrera.toLowerCase().includes(termino)
    )
  })

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasRole('MESA_PARTES') && !hasRole('ADMIN') && !hasRole('SUPER_ADMIN')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Esta sección es solo para personal de Mesa de Partes.
            </p>
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
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Inbox className="w-7 h-7 text-primary" />
            Mesa de Partes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de proyectos de tesis recibidos
          </p>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(ESTADO_CONFIG).map(([estado, config]) => (
            <Card
              key={estado}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                filtroEstado === estado && 'ring-2 ring-primary'
              )}
              onClick={() => setFiltroEstado(estado)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {contadores[estado as keyof Contadores]}
                    </p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                  <div className={cn('p-2 rounded-lg', config.bgColor, config.color)}>
                    {config.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, código, autor o carrera..."
                  className="pl-9"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN_REVISION">En Revisión</SelectItem>
                  <SelectItem value="OBSERVADA">Observadas</SelectItem>
                  <SelectItem value="APROBADA">Aprobadas</SelectItem>
                  <SelectItem value="RECHAZADA">Rechazadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de proyectos */}
        {proyectosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Inbox className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
              <p className="text-muted-foreground">
                {busqueda
                  ? 'No se encontraron proyectos con los criterios de búsqueda'
                  : `No hay proyectos en estado "${ESTADO_CONFIG[filtroEstado]?.label}"`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {proyectosFiltrados.map((proyecto) => {
              const estadoConfig = ESTADO_CONFIG[proyecto.estado] || ESTADO_CONFIG.EN_REVISION
              return (
                <Card key={proyecto.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs">
                            {proyecto.codigo}
                          </Badge>
                          <Badge className={cn(estadoConfig.bgColor, estadoConfig.color, 'gap-1')}>
                            {estadoConfig.icon}
                            {estadoConfig.label}
                          </Badge>
                          {proyecto.facultad && (
                            <Badge variant="secondary" className="text-xs">
                              {proyecto.facultad.codigo}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold line-clamp-2 mb-2">{proyecto.titulo}</h3>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>
                              {proyecto.autorPrincipal?.nombre || 'Sin autor'}
                              {proyecto.cantidadAutores > 1 && ` (+${proyecto.cantidadAutores - 1})`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{proyecto.carrera}</span>
                          </div>
                        </div>
                      </div>

                      {/* Info adicional y acciones */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Indicadores de documentos */}
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                              proyecto.tieneProyecto
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                            )}
                            title={proyecto.tieneProyecto ? 'Proyecto subido' : 'Sin proyecto'}
                          >
                            PDF
                          </div>
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                              proyecto.tieneCartaAsesor
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                            )}
                            title={proyecto.tieneCartaAsesor ? 'Carta firmada' : 'Sin carta firmada'}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Fecha */}
                        <div className="text-sm text-muted-foreground">
                          {new Date(proyecto.fechaEnvio).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>

                        {/* Botón ver */}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/mesa-partes/${proyecto.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            Revisar
                          </Link>
                        </Button>
                      </div>
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
