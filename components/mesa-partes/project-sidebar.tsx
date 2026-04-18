'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Ban, Gavel, GraduationCap, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TIPO_JURADO_LABELS, TIPO_JURADO_COLORS } from './constants'
import type { Proyecto, Jurado } from './types'

interface ProjectSidebarProps {
  proyecto: Proyecto
  esAsignandoJurados: boolean
  juradosProyecto: Jurado[]
  juradosInforme: Jurado[]
}

export function ProjectSidebar({
  proyecto,
  esAsignandoJurados,
  juradosProyecto,
  juradosInforme,
}: ProjectSidebarProps) {
  return (
    <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
      {/* Autores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Tesistas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proyecto.autores.map((autor) => {
            const esDesistido = autor.estado === 'DESISTIDO'
            return (
              <div key={autor.id} className={cn('flex items-start gap-3', esDesistido && 'opacity-70')}>
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                  esDesistido
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : autor.tipoParticipante === 'AUTOR_PRINCIPAL'
                      ? 'bg-primary/10'
                      : 'bg-blue-100 dark:bg-blue-900/50'
                )}>
                  {esDesistido ? (
                    <Ban className="w-4 h-4 text-slate-400" />
                  ) : (
                    <User className={cn(
                      'w-4 h-4',
                      autor.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'text-primary' : 'text-blue-600',
                    )} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium text-sm truncate',
                    esDesistido && 'line-through text-muted-foreground',
                  )}>
                    {autor.nombre}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {esDesistido
                        ? 'Desistió del proyecto'
                        : autor.tipoParticipante === 'AUTOR_PRINCIPAL' ? 'Tesista 1' : 'Tesista 2'}
                    </p>
                    {esDesistido && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-400 text-slate-500">
                        Histórico
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{autor.codigo}</p>
                  <p className="text-xs text-muted-foreground truncate">{autor.email}</p>
                </div>
              </div>
            )
          })}
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
          {proyecto.asesores.map((asesor) => (
            <div key={asesor.id} className="flex items-start gap-3">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                asesor.estado === 'ACEPTADO'
                  ? 'bg-green-100 dark:bg-green-900/50'
                  : 'bg-yellow-100 dark:bg-yellow-900/50'
              )}>
                <GraduationCap className={cn(
                  'w-4 h-4',
                  asesor.estado === 'ACEPTADO' ? 'text-green-600' : 'text-yellow-600'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{asesor.nombre}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{asesor.tipo}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0',
                      asesor.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                      asesor.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600'
                    )}
                  >
                    {asesor.estado === 'ACEPTADO' ? 'Aceptado' : 'Pendiente'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{asesor.email}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Jurados */}
      {!esAsignandoJurados && (proyecto.jurados || []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="w-4 h-4 text-primary" />
              Jurados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {juradosProyecto.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aprobación de Proyecto</p>
                {juradosProyecto.map((jurado) => (
                  <div key={jurado.id} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{jurado.nombre}</p>
                      <Badge className={cn('text-[10px] px-1.5 py-0', TIPO_JURADO_COLORS[jurado.tipo])}>
                        {TIPO_JURADO_LABELS[jurado.tipo]}
                      </Badge>
                      <p className="text-xs text-muted-foreground truncate">{jurado.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {juradosProyecto.length > 0 && juradosInforme.length > 0 && (
              <Separator />
            )}

            {juradosInforme.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Informe Final</p>
                {juradosInforme.map((jurado) => (
                  <div key={jurado.id} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{jurado.nombre}</p>
                      <Badge className={cn('text-[10px] px-1.5 py-0', TIPO_JURADO_COLORS[jurado.tipo])}>
                        {TIPO_JURADO_LABELS[jurado.tipo]}
                      </Badge>
                      <p className="text-xs text-muted-foreground truncate">{jurado.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha de registro</span>
              <span className="font-medium">
                {new Date(proyecto.createdAt).toLocaleDateString('es-PE')}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Documentos</span>
              <span className="font-medium">{proyecto.documentos.length}</span>
            </div>
            {proyecto.fechaLimiteEvaluacion && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Limite evaluacion (d.h.)</span>
                  <span className="font-medium">
                    {new Date(proyecto.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                  </span>
                </div>
              </>
            )}
            {proyecto.fechaLimiteCorreccion && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Limite correccion (d.h.)</span>
                  <span className="font-medium">
                    {new Date(proyecto.fechaLimiteCorreccion).toLocaleDateString('es-PE')}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
