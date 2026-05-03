'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Ban, ShieldAlert, CalendarPlus, Loader2, Sparkles, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { isAutoRechazo } from '@/lib/thesis/auto-rechazo'

interface HistorialItem {
  estadoAnterior: string | null
  estadoNuevo: string
  comentario: string | null
  fecha: string
}

interface Props {
  thesisId: string
  estadoTesis: string
  historial: HistorialItem[]
  onUpdated?: () => void
}

function fmt(d: string | Date) {
  return new Date(d).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Lima',
  })
}

export function ReabrirRechazadaCard({ thesisId, estadoTesis, historial, onUpdated }: Props) {
  const ultimo = useMemo(
    () => historial.find((h) => h.estadoNuevo === 'RECHAZADA'),
    [historial],
  )

  const esAutoRechazo = useMemo(() => isAutoRechazo(ultimo?.comentario), [ultimo])

  // Solo mostramos cuando: estado RECHAZADA Y rechazo automático.
  // Rechazos manuales por mesa-partes (RECHAZAR) son definitivos por diseño.
  if (estadoTesis !== 'RECHAZADA' || !esAutoRechazo) return null

  return <CardContent thesisId={thesisId} ultimo={ultimo!} onUpdated={onUpdated} />
}

interface CardContentProps {
  thesisId: string
  ultimo: HistorialItem
  onUpdated?: () => void
}

function CardContent({ thesisId, ultimo, onUpdated }: CardContentProps) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [dias, setDias] = useState(15)
  const [submitting, setSubmitting] = useState(false)

  const fechaProyectada = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    return d
  }, [dias])

  const fechaVencimientoOriginal = useMemo(() => {
    const m = ultimo.comentario?.match(/venció el (\d{1,2}\/\d{1,2}\/\d{4})/)
    return m?.[1] ?? null
  }, [ultimo])

  const motivoValido = motivo.trim().length >= 30
  const diasValido = dias >= 1 && dias <= 60

  return (
    <>
      <div className="rounded-xl border border-red-300/70 dark:border-red-900/60 bg-gradient-to-br from-red-50 via-red-50/40 to-card dark:from-red-950/30 dark:via-red-950/15 dark:to-card overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50 ring-1 ring-inset ring-red-200/70 dark:ring-red-900/60">
            <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold tracking-tight text-red-900 dark:text-red-100">
                Tesis cerrada por vencimiento de plazo
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                Auto-rechazo
              </span>
            </div>

            <p className="mt-2 text-xs text-red-800/90 dark:text-red-200/90 leading-relaxed">
              El plazo de subsanación venció {fechaVencimientoOriginal ? <>el <b>{fechaVencimientoOriginal}</b></> : 'sin que el tesista presentara las correcciones'}. Si el retraso fue por <b>fuerza mayor documentada</b> (enfermedad, accidente, error administrativo), puedes reabrir la tesis con un plazo nuevo.
            </p>

            <details className="mt-2 group">
              <summary className="text-[11px] cursor-pointer text-red-700/80 dark:text-red-300/80 hover:text-red-900 dark:hover:text-red-100 inline-flex items-center gap-1 select-none">
                <ShieldAlert className="w-3 h-3" /> Ver detalle del rechazo automático
              </summary>
              <div className="mt-1.5 pl-4 text-[11px] text-red-800/80 dark:text-red-200/80 italic border-l-2 border-red-200 dark:border-red-900/50">
                {ultimo.comentario}
              </div>
              <div className="mt-1 pl-4 text-[10px] text-red-700/60 dark:text-red-300/60">
                Registrado: {fmt(ultimo.fecha)}
              </div>
            </details>
          </div>

          <Button
            onClick={() => setOpen(true)}
            size="sm"
            variant="outline"
            className="shrink-0 border-red-300 hover:bg-red-100/50 dark:border-red-800 dark:hover:bg-red-950/40"
          >
            <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
            Reabrir excepcionalmente
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="border-b bg-gradient-to-br from-red-50/50 to-card dark:from-red-950/20 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/40 ring-1 ring-inset ring-red-200 dark:ring-red-900/60">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Reabrir tesis rechazada
                </DialogTitle>
                <DialogDescription className="text-[12px] mt-0.5">
                  Reapertura excepcional autorizada por mesa de partes con motivo documentado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-[12px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado actual</span>
                <span className="font-medium text-red-700 dark:text-red-300">RECHAZADA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado tras reapertura</span>
                <span className="font-medium text-amber-700 dark:text-amber-300">Estado anterior al rechazo</span>
              </div>
              {fechaVencimientoOriginal && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plazo original venció</span>
                  <span className="font-medium tabular-nums">{fechaVencimientoOriginal}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 pt-1.5 border-t">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Plazo nuevo</span>
                <span className="font-bold tabular-nums">{fmt(fechaProyectada)}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs">Días calendario para subsanar</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={dias}
                  onChange={(e) => setDias(Math.max(1, Math.min(60, Number(e.target.value) || 15)))}
                  className="w-24 tabular-nums"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[7, 15, 30].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setDias(d)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border',
                        dias === d
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card hover:bg-muted/60 border-border text-muted-foreground',
                      )}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Rango permitido: 1–60 días calendario.
              </p>
            </div>

            <div>
              <Label className="text-xs">
                Motivo de la reapertura <span className="text-muted-foreground font-normal">(mínimo 30 caracteres, queda en historial)</span>
              </Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
                className="mt-1.5"
                placeholder="Ej: Tesista presentó constancia médica de hospitalización del 15 al 30 de marzo. Documentación adjunta verificada por mesa de partes."
              />
              <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                {motivo.trim().length} / 30 caracteres mínimos
              </p>
            </div>

            <div className="rounded-lg border border-amber-200/70 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50 p-3 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Esta acción <b>queda registrada en el historial de la tesis</b> con tu identidad como autorizador. Úsala solo cuando exista justificación documentada de fuerza mayor.
              </span>
            </div>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-6 py-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              disabled={submitting || !motivoValido || !diasValido}
              onClick={async () => {
                setSubmitting(true)
                try {
                  const r = await fetch(`/api/mesa-partes/${thesisId}/reabrir-rechazada`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ motivo: motivo.trim(), diasPlazoNuevo: dias }),
                  })
                  const data = await r.json()
                  if (!r.ok) {
                    toast.error(data.error ?? 'No se pudo reabrir la tesis')
                    return
                  }
                  toast.success(data.message ?? 'Tesis reabierta')
                  setOpen(false)
                  setMotivo('')
                  onUpdated?.()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Error de red')
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar reapertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
