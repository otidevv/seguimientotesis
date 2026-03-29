'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Check, CheckCircle2, GraduationCap, Loader2, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Participante } from './types'

interface ParticipantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modo: 'AGREGAR' | 'REEMPLAZAR'
  tipo: string | null
  busqueda: string
  onBusquedaChange: (value: string) => void
  buscando: boolean
  resultados: Participante[]
  seleccionado: Participante | null
  onSeleccionar: (p: Participante) => void
  reemplazando: boolean
  onConfirmar: () => void
}

export function ParticipantDialog({
  open,
  onOpenChange,
  modo,
  tipo,
  busqueda,
  onBusquedaChange,
  buscando,
  resultados,
  seleccionado,
  onSeleccionar,
  reemplazando,
  onConfirmar,
}: ParticipantDialogProps) {
  const tipoLabel = tipo === 'COAUTOR' ? 'Tesista 2' : tipo === 'ASESOR' ? 'Asesor' : 'Coasesor'
  const esEstudiante = tipo === 'COAUTOR'

  if (!tipo) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modo === 'AGREGAR' ? 'Agregar' : 'Cambiar'} {tipoLabel}
          </DialogTitle>
          <DialogDescription>
            Busca y selecciona {esEstudiante ? 'al estudiante' : 'al docente'} que participará en tu proyecto.
            {esEstudiante && (
              <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                Solo se mostrarán estudiantes de tu misma carrera.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={esEstudiante ? 'Buscar por nombre o código...' : 'Buscar por nombre...'}
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {buscando ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : resultados.length > 0 ? (
              resultados.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSeleccionar(p)}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-all',
                    seleccionado?.id === p.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {esEstudiante ? (
                        <User className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <GraduationCap className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {p.apellidoPaterno} {p.apellidoMaterno}, {p.nombres}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {esEstudiante
                          ? `${p.codigoEstudiante || 'Sin código'} • ${p.carrera || 'Sin carrera'}`
                          : `${p.codigoDocente || ''} • ${p.departamento || 'Sin departamento'}`}
                      </p>
                    </div>
                    {seleccionado?.id === p.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>
              ))
            ) : busqueda.length >= 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No se encontraron resultados</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
              </div>
            )}
          </div>

          {seleccionado && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Seleccionado:</p>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {seleccionado.apellidoPaterno} {seleccionado.apellidoMaterno}, {seleccionado.nombres}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reemplazando}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirmar}
            disabled={!seleccionado || reemplazando}
          >
            {reemplazando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {modo === 'AGREGAR' ? 'Agregando...' : 'Cambiando...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {modo === 'AGREGAR' ? 'Agregar' : 'Confirmar cambio'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
