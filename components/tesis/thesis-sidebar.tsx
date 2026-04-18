'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Info, RefreshCw, Trash2, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tesis } from './types'

interface ThesisSidebarProps {
  tesis: Tesis
  puedeEditar: boolean
  puedeGestionarParticipantes?: boolean
  esAutorPrincipal: boolean
  coautor: Tesis['autores'][number] | undefined
  coasesor: Tesis['asesores'][number] | undefined
  onReemplazar: (tipo: 'COAUTOR' | 'ASESOR' | 'COASESOR', participanteId: string) => void
  onEliminar: (tipo: 'COAUTOR' | 'COASESOR', participanteId: string) => void
  onAgregar: (tipo: 'COAUTOR' | 'COASESOR') => void
}

export function ThesisSidebar({
  tesis,
  puedeEditar,
  puedeGestionarParticipantes,
  esAutorPrincipal,
  coautor,
  coasesor,
  onReemplazar,
  onEliminar,
  onAgregar,
}: ThesisSidebarProps) {
  const puedeParticipantes = puedeGestionarParticipantes ?? puedeEditar
  return (
    <div className="space-y-6">
      {/* Tesistas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Tesistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tesis.autores.map((a) => {
            const esDesistido = a.estado === 'DESISTIDO'
            return (
              <div key={a.id} className={cn('space-y-2', esDesistido && 'opacity-70')}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    esDesistido
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : a.tipoParticipante === 'AUTOR_PRINCIPAL'
                        ? 'bg-primary/10'
                        : a.estado === 'ACEPTADO'
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : a.estado === 'RECHAZADO'
                            ? 'bg-red-100 dark:bg-red-900/50'
                            : 'bg-yellow-100 dark:bg-yellow-900/50'
                  )}>
                    <User className={cn(
                      'w-4 h-4',
                      esDesistido
                        ? 'text-slate-400'
                        : a.tipoParticipante === 'AUTOR_PRINCIPAL'
                          ? 'text-primary'
                          : a.estado === 'ACEPTADO'
                            ? 'text-green-600'
                            : a.estado === 'RECHAZADO'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium text-sm truncate',
                      esDesistido && 'line-through text-muted-foreground',
                    )}>
                      {a.user.apellidoPaterno} {a.user.apellidoMaterno}, {a.user.nombres}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {esDesistido
                          ? 'Desistió del proyecto'
                          : `${a.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'Tesista 1' : 'Tesista 2'} • ${a.studentCareer.codigoEstudiante}`
                        }
                      </span>
                      {(a.tipoParticipante === 'COAUTOR' || esDesistido) && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            a.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                            a.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                            a.estado === 'RECHAZADO' && 'border-red-500 text-red-600',
                            esDesistido && 'border-slate-400 text-slate-500',
                          )}
                        >
                          {a.estado === 'PENDIENTE' ? 'Pendiente' : a.estado === 'ACEPTADO' ? 'Aceptado' : esDesistido ? 'Histórico' : 'Rechazado'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* Acciones: solo sobre coautor ACTIVO (no desistido, no aceptado) */}
                {puedeParticipantes && esAutorPrincipal && a.tipoParticipante === 'COAUTOR' && !esDesistido && a.estado !== 'ACEPTADO' && (
                  <div className="flex gap-2 ml-12">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onReemplazar('COAUTOR', a.id)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Cambiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onEliminar('COAUTOR', a.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            )
          })}

          {puedeParticipantes && esAutorPrincipal && !coautor && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => onAgregar('COAUTOR')}
            >
              <Users className="w-4 h-4 mr-2" />
              Agregar Tesista 2
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Asesores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            Asesores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tesis.asesores.map((a) => (
            <div key={a.id} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                  a.estado === 'ACEPTADO'
                    ? 'bg-green-100 dark:bg-green-900/50'
                    : a.estado === 'RECHAZADO'
                      ? 'bg-red-100 dark:bg-red-900/50'
                      : a.tipoAsesor === 'ASESOR'
                        ? 'bg-green-100 dark:bg-green-900/50'
                        : 'bg-purple-100 dark:bg-purple-900/50'
                )}>
                  <GraduationCap className={cn(
                    'w-4 h-4',
                    a.estado === 'ACEPTADO'
                      ? 'text-green-600'
                      : a.estado === 'RECHAZADO'
                        ? 'text-red-600'
                        : a.tipoAsesor === 'ASESOR'
                          ? 'text-green-600'
                          : 'text-purple-600'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {a.user.apellidoPaterno} {a.user.apellidoMaterno}, {a.user.nombres}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {a.tipoAsesor === 'ASESOR' ? 'Asesor' : 'Coasesor'}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        a.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                        a.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                        a.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
                      )}
                    >
                      {a.estado === 'PENDIENTE' ? 'Pendiente' : a.estado === 'ACEPTADO' ? 'Aceptado' : 'Rechazado'}
                    </Badge>
                  </div>
                </div>
              </div>
              {puedeParticipantes && esAutorPrincipal && a.estado !== 'ACEPTADO' && (
                <div className="flex gap-2 ml-12">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onReemplazar(a.tipoAsesor === 'ASESOR' ? 'ASESOR' : 'COASESOR', a.id)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Cambiar
                  </Button>
                  {a.tipoAsesor === 'COASESOR' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onEliminar('COASESOR', a.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Eliminar
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}

          {puedeParticipantes && esAutorPrincipal && !coasesor && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => onAgregar('COASESOR')}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Agregar Coasesor
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Importante</p>
              <p className="text-xs text-muted-foreground">
                Una vez enviado a revisión, no podrás modificar los documentos hasta recibir observaciones o aprobación.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
