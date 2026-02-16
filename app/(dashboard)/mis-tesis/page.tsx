'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  GraduationCap,
  Calendar,
  Eye,
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

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  // Estados principales del enum de Prisma
  BORRADOR: { label: 'Borrador', color: 'bg-gray-500', icon: <FileText className="w-3 h-3" /> },
  EN_REVISION: { label: 'Proyecto en Revisión', color: 'bg-blue-500', icon: <Clock className="w-3 h-3" /> },
  OBSERVADA: { label: 'Observada', color: 'bg-orange-500', icon: <AlertCircle className="w-3 h-3" /> },
  APROBADA: { label: 'Proyecto Aprobado', color: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" /> },
  EN_SUSTENTACION: { label: 'En Sustentación', color: 'bg-purple-500', icon: <Calendar className="w-3 h-3" /> },
  SUSTENTADA: { label: 'Sustentada', color: 'bg-emerald-600', icon: <GraduationCap className="w-3 h-3" /> },
  ARCHIVADA: { label: 'Archivada', color: 'bg-slate-500', icon: <FileText className="w-3 h-3" /> },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-500', icon: <AlertCircle className="w-3 h-3" /> },
  // Estados del flujo de evaluación
  ASIGNANDO_JURADOS: { label: 'Asignando Jurados', color: 'bg-purple-500', icon: <Clock className="w-3 h-3" /> },
  EN_EVALUACION_JURADO: { label: 'En Evaluación', color: 'bg-indigo-500', icon: <Clock className="w-3 h-3" /> },
  OBSERVADA_JURADO: { label: 'Observada por Jurado', color: 'bg-orange-500', icon: <AlertCircle className="w-3 h-3" /> },
  PROYECTO_APROBADO: { label: 'Proyecto Aprobado', color: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" /> },
  INFORME_FINAL: { label: 'Informe Final', color: 'bg-cyan-500', icon: <FileText className="w-3 h-3" /> },
  EN_EVALUACION_INFORME: { label: 'Evaluando Informe', color: 'bg-indigo-500', icon: <Clock className="w-3 h-3" /> },
  OBSERVADA_INFORME: { label: 'Informe Observado', color: 'bg-orange-500', icon: <AlertCircle className="w-3 h-3" /> },
  // Estados legacy para compatibilidad
  REGISTRO_PENDIENTE: { label: 'Proyecto en Revisión', color: 'bg-blue-500', icon: <Clock className="w-3 h-3" /> },
  PROYECTO_OBSERVADO: { label: 'Observada', color: 'bg-orange-500', icon: <AlertCircle className="w-3 h-3" /> },
}

export default function MisTesisPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole } = useAuth()
  const [tesis, setTesis] = useState<Tesis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Verificar que el usuario es estudiante
  if (!hasRole('ESTUDIANTE')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-primary" />
              Mis Tesis
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tus proyectos de tesis
            </p>
          </div>
          <Button asChild>
            <Link href="/mis-tesis/nuevo">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proyecto
            </Link>
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de tesis */}
        {tesis.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tienes proyectos de tesis</h3>
              <p className="text-muted-foreground mb-6">
                Comienza registrando tu proyecto de tesis
              </p>
              <Button asChild>
                <Link href="/mis-tesis/nuevo">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Proyecto
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tesis.map((t) => {
              const estadoConfig = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG.BORRADOR
              return (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {t.codigo}
                          </Badge>
                          <Badge className={`${estadoConfig.color} text-white text-xs`}>
                            {estadoConfig.icon}
                            <span className="ml-1">{estadoConfig.label}</span>
                          </Badge>
                        </div>
                        <CardTitle className="text-lg leading-tight line-clamp-2">
                          {t.titulo}
                        </CardTitle>
                        <CardDescription>
                          {t.carreraNombre} • {t.facultad.nombre}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/mis-tesis/${t.id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-col sm:flex-row gap-4 text-sm">
                      {/* Tesistas */}
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">{t.autores.length > 1 ? 'Tesistas: ' : 'Tesista: '}</span>
                          <span>
                            {t.autores
                              .map((a) => `${a.user.apellidoPaterno} ${a.user.apellidoMaterno}, ${a.user.nombres}`)
                              .join(' & ')}
                          </span>
                        </div>
                      </div>
                      {/* Asesores */}
                      <div className="flex items-start gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Asesor: </span>
                          <span>
                            {t.asesores
                              .filter((a) => a.tipoAsesor === 'ASESOR')
                              .map((a) => `${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`)
                              .join(', ')}
                          </span>
                        </div>
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
