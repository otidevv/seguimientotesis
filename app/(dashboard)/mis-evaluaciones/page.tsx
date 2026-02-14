'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Eye,
  Loader2,
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
  rondaActual: number
  faseActual: string | null
  fechaLimiteEvaluacion: string | null
  autores: string
  yaEvaluo: boolean
  miResultado: string | null
}

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

export default function MisEvaluacionesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user) {
      loadEvaluaciones()
    }
  }, [authLoading, user])

  const loadEvaluaciones = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mis-evaluaciones')
      const data = await response.json()
      if (data.success) {
        setEvaluaciones(data.data)
      }
    } catch {
      // Error silencioso
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

  const pendientes = evaluaciones.filter((e) =>
    ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME'].includes(e.estado) && !e.yaEvaluo
  )
  const evaluadas = evaluaciones.filter((e) => e.yaEvaluo)
  const otras = evaluaciones.filter((e) =>
    !['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME'].includes(e.estado) && !e.yaEvaluo
  )

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
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
                <p className="text-2xl font-bold">{pendientes.length}</p>
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
                <p className="text-2xl font-bold">{evaluadas.length}</p>
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
                <p className="text-2xl font-bold">{evaluaciones.length}</p>
                <p className="text-xs text-muted-foreground">Total asignadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tesis Asignadas</CardTitle>
          </CardHeader>
          <CardContent>
            {evaluaciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tienes tesis asignadas para evaluacion</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tesis</TableHead>
                    <TableHead className="hidden md:table-cell">Mi Rol</TableHead>
                    <TableHead className="hidden md:table-cell">Fase</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Fecha Limite</TableHead>
                    <TableHead>Mi Evaluacion</TableHead>
                    <TableHead className="w-[80px]">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluaciones.map((item) => {
                    const estadoConfig = ESTADO_LABELS[item.estado]
                    const puedeEvaluar = ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME'].includes(item.estado) && !item.yaEvaluo
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
                        <TableCell className="hidden md:table-cell">
                          {item.fechaLimiteEvaluacion ? (
                            <span className="text-xs">
                              {new Date(item.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.yaEvaluo ? (
                            <Badge variant="outline" className={cn(
                              'text-xs',
                              item.miResultado === 'APROBADO'
                                ? 'border-green-500 text-green-600'
                                : 'border-orange-500 text-orange-600'
                            )}>
                              {item.miResultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
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
                            <Link href={`/mis-evaluaciones/${item.thesisId}`}>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
