'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { CalendarPlus, Loader2, ShieldCheck, AlertCircle, Sparkles, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AmpliacionExistente {
  id: string
  motivo: string
  diasExtendidos: number
  fechaLimiteAnterior: string
  fechaLimiteNueva: string
  createdAt: string
}

interface SolicitarAmpliacionStatus {
  puedeSolicitar: boolean
  motivoNoPuedeSolicitar: string | null
  ampliacionExistente: AmpliacionExistente | null
  diasDisponibles: number
}

interface Props {
  thesisId: string
  /** Si las observaciones acaban de aparecer recientemente (últimos N días),
   *  el banner se muestra siempre. Si quedan pocos días, también. */
  fechaLimiteCorreccion: string | null
  estadoTesis: string
  onUpdated?: () => void
}

const ESTADOS_AMPLIABLES = ['OBSERVADA', 'OBSERVADA_JURADO']

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Lima',
  })
}

function diasRestantesLima(fin: string): number {
  const ymd = (d: Date) => {
    const p = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d)
    const get = (t: string) => Number(p.find(x => x.type === t)?.value)
    return Date.UTC(get('year'), get('month') - 1, get('day'))
  }
  return Math.round((ymd(new Date(fin)) - ymd(new Date())) / 86400000)
}

export function AmpliacionPlazoBanner({
  thesisId,
  fechaLimiteCorreccion,
  estadoTesis,
  onUpdated,
}: Props) {
  const [status, setStatus] = useState<SolicitarAmpliacionStatus | null>(null)
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const enFaseProyecto = ESTADOS_AMPLIABLES.includes(estadoTesis)

  const cargar = useCallback(async () => {
    if (!enFaseProyecto || !fechaLimiteCorreccion) {
      setStatus(null)
      return
    }
    try {
      const r = await fetch(`/api/tesis/${thesisId}/solicitar-ampliacion`)
      if (!r.ok) return
      setStatus(await r.json())
    } catch {
      // silencioso
    }
  }, [thesisId, enFaseProyecto, fechaLimiteCorreccion])

  useEffect(() => { cargar() }, [cargar])

  // No mostrar si: no aplica fase, sin plazo, o ya venció hace mucho
  if (!enFaseProyecto || !fechaLimiteCorreccion || !status) return null

  const dias = diasRestantesLima(fechaLimiteCorreccion)

  // Si no puede solicitar y NO hay ampliación previa (ej. plazo vencido), no mostramos
  if (!status.puedeSolicitar && !status.ampliacionExistente) return null

  // Caso 1: ampliación ya aplicada → mostrar resumen confirmado
  if (status.ampliacionExistente) {
    const a = status.ampliacionExistente
    return (
      <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 leading-tight">
              Plazo ampliado a {fmt(a.fechaLimiteNueva)}
            </p>
            <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/80 leading-relaxed">
              Solicitaste {a.diasExtendidos} días más el {fmt(a.createdAt)}.{' '}
              {dias > 0 ? (
                <>Te quedan <b className="tabular-nums">{dias} {dias === 1 ? 'día' : 'días'}</b> para presentar correcciones.</>
              ) : dias === 0 ? (
                <b>Hoy es el último día para presentar correcciones.</b>
              ) : (
                <b>El plazo ampliado también venció.</b>
              )}
            </p>
            {a.motivo && (
              <p className="mt-1.5 text-[11px] text-emerald-800/70 dark:text-emerald-200/60 italic line-clamp-2">
                "{a.motivo}"
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Caso 2: puede solicitar → mostrar banner CTA
  // Mostrar siempre cuando puede solicitar (idealmente solo si quedan ≤7 días, pero
  // damos visibilidad continua porque el reglamento permite pedirlo en cualquier momento)
  const urgente = dias <= 5
  return (
    <>
      <div className={cn(
        'rounded-xl border p-4 transition-colors',
        urgente
          ? 'border-amber-300/70 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 to-amber-50/40 dark:from-amber-950/30 dark:to-amber-950/10'
          : 'border-sky-200/70 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20',
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              urgente ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-sky-100 dark:bg-sky-950/40',
            )}>
              {urgente ? (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-semibold leading-tight',
                urgente ? 'text-amber-900 dark:text-amber-100' : 'text-sky-900 dark:text-sky-100',
              )}>
                {urgente
                  ? `Quedan ${Math.max(0, dias)} ${dias === 1 ? 'día' : 'días'} para presentar correcciones`
                  : '¿Necesitas más tiempo para corregir?'}
              </p>
              <p className={cn(
                'mt-1 text-xs leading-relaxed',
                urgente ? 'text-amber-800/90 dark:text-amber-200/80' : 'text-sky-800/90 dark:text-sky-200/80',
              )}>
                Puedes solicitar <b>{status.diasDisponibles} días calendario adicionales</b>. La ampliación se aplica al confirmar; basta con indicar el motivo.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={urgente ? 'default' : 'outline'}
            onClick={() => setOpen(true)}
            className="shrink-0"
          >
            <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
            Solicitar {status.diasDisponibles} días más
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="border-b bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15">
                <CalendarPlus className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Solicitar ampliación de plazo
                </DialogTitle>
                <DialogDescription className="text-[12px] mt-0.5">
                  +{status.diasDisponibles} días calendario al plazo actual de subsanación.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-[12px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plazo actual</span>
                <span className="font-medium tabular-nums">{fmt(fechaLimiteCorreccion)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Plazo nuevo</span>
                <span className="font-bold tabular-nums">
                  {fmt(new Date(new Date(fechaLimiteCorreccion).getTime() + status.diasDisponibles * 86400000).toISOString())}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">
                Motivo de la solicitud <span className="text-muted-foreground font-normal">(mínimo 30 caracteres)</span>
              </label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
                className="mt-1.5"
                placeholder="Ej: Las observaciones requieren cambios estructurales en el marco teórico que necesitan tiempo para investigación adicional..."
              />
              <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                {motivo.trim().length} / 30 caracteres mínimos
              </p>
            </div>

            <div className="rounded-lg border border-amber-200/70 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/50 p-3 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
              Esta es la <b>única ampliación</b> permitida por ronda de observación. Si no logras corregir dentro del nuevo plazo, no podrás pedir otra.
            </div>
          </div>
          <DialogFooter className="border-t bg-muted/20 px-6 py-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              disabled={submitting || motivo.trim().length < 30}
              onClick={async () => {
                setSubmitting(true)
                try {
                  const r = await fetch(`/api/tesis/${thesisId}/solicitar-ampliacion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ motivo: motivo.trim() }),
                  })
                  const data = await r.json()
                  if (!r.ok) {
                    toast.error(data.error ?? 'No se pudo solicitar la ampliación')
                    return
                  }
                  toast.success(data.message ?? 'Plazo ampliado')
                  setOpen(false)
                  setMotivo('')
                  await cargar()
                  onUpdated?.()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Error de red')
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar ampliación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
