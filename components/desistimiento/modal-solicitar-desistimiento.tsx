'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MOTIVOS_DESISTIMIENTO } from '@/lib/constants/motivos-desistimiento'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, Users, User, Info, HeartHandshake } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  thesisId: string
  tituloTesis: string
  /** Si es `true`, la tesis continuará con el coautor. Si es `false`, quedará DESISTIDA. */
  tieneCoautor?: boolean
  onSuccess?: () => void
}

const MIN_CARS = 20
const SOFT_MIN = 50

// Sugerencias de retención según la categoría elegida.
const SUGERENCIAS: Record<string, string> = {
  PROBLEMA_ASESOR: '¿Sabías que puedes reemplazar al asesor sin desistir de la tesis? Considera hablar con la coordinación.',
  PROBLEMA_COAUTOR: 'Puedes reemplazar al coautor o continuar solo/a sin desistir. Conversa con tu coordinador antes de decidir.',
  CAMBIO_TEMA: 'Si tu tema cambia, podrías modificar el proyecto manteniendo tu avance en lugar de desistir. Consulta con tu asesor.',
  FALTA_TIEMPO: 'Recuerda que puedes solicitar una ampliación de plazo en la coordinación. Revisa esa opción antes de desistir.',
}

export function ModalSolicitarDesistimiento({
  open,
  onOpenChange,
  thesisId,
  tituloTesis,
  tieneCoautor,
  onSuccess,
}: Props) {
  const [categoria, setCategoria] = useState<string>('')
  const [descripcion, setDescripcion] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setCategoria('')
      setDescripcion('')
      setConfirmado(false)
      setError(null)
    }
  }, [open])

  const caracteres = descripcion.trim().length
  const contadorColor = useMemo(() => {
    if (caracteres === 0) return 'text-muted-foreground'
    if (caracteres < MIN_CARS) return 'text-red-600'
    if (caracteres < SOFT_MIN) return 'text-amber-600'
    return 'text-emerald-600'
  }, [caracteres])

  const puedeEnviar =
    !loading &&
    !!categoria &&
    caracteres >= MIN_CARS &&
    confirmado

  async function handleSubmit() {
    setError(null)
    if (!categoria) { setError('Selecciona un motivo'); return }
    if (caracteres < MIN_CARS) { setError(`La descripción debe tener al menos ${MIN_CARS} caracteres`); return }
    if (!confirmado) { setError('Debes confirmar que entiendes las consecuencias'); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/tesis/${thesisId}/desistir/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCategoria: categoria, motivoDescripcion: descripcion.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar solicitud')
      toast.success('Solicitud enviada. Mesa de partes te escribirá en breve.', {
        description: 'Si necesitas apoyo emocional, contacta a Bienestar Universitario.',
        duration: 6000,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const sugerencia = categoria && SUGERENCIAS[categoria]

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />
            Solicitar desistimiento de tesis
          </DialogTitle>
          <DialogDescription>
            &ldquo;{tituloTesis}&rdquo; — Tu solicitud será revisada por mesa de partes.
          </DialogDescription>
        </DialogHeader>

        {/* Advertencia contextual según escenario */}
        {tieneCoautor !== undefined && (
          <div
            className={cn(
              'rounded-lg border-2 p-3 flex items-start gap-3',
              tieneCoautor
                ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30'
                : 'border-red-300 bg-red-50 dark:bg-red-950/30',
            )}
          >
            {tieneCoautor ? (
              <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <User className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="text-sm">
              <p className={cn('font-semibold', tieneCoautor ? 'text-blue-900 dark:text-blue-100' : 'text-red-900 dark:text-red-100')}>
                {tieneCoautor ? 'Hay coautor en este proyecto' : 'Eres el autor único del proyecto'}
              </p>
              <p className={cn('mt-0.5', tieneCoautor ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200')}>
                {tieneCoautor
                  ? 'Si mesa de partes aprueba, tu coautor continuará como autor principal. La tesis no se pierde.'
                  : 'Si mesa de partes aprueba, la tesis quedará en estado DESISTIDA y no podrás retomarla. Podrás crear un proyecto nuevo.'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="categoria">Motivo principal</Label>
            <Select value={categoria} onValueChange={setCategoria} disabled={loading}>
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_DESISTIMIENTO.map(m => (
                  <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sugerencia de retención si aplica */}
          {sugerencia && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-amber-900 dark:text-amber-100">{sugerencia}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descripcion">
              Descripción detallada <span className="text-muted-foreground font-normal">(mínimo {MIN_CARS} caracteres)</span>
            </Label>
            <Textarea
              id="descripcion"
              rows={5}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Explica brevemente las razones de tu desistimiento..."
              disabled={loading}
              aria-describedby="desc-counter"
            />
            <div className="flex items-center justify-between">
              <p id="desc-counter" className={cn('text-xs font-medium tabular-nums', contadorColor)} aria-live="polite">
                {caracteres} / {MIN_CARS} mín.
              </p>
              {caracteres >= MIN_CARS && caracteres < SOFT_MIN && (
                <p className="text-xs text-amber-600">Considera agregar más detalle para que mesa de partes tenga contexto.</p>
              )}
            </div>
          </div>

          {/* Checkbox de confirmación doble */}
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              disabled={loading}
              className="mt-0.5 w-4 h-4 accent-red-600 cursor-pointer"
              aria-describedby="confirm-label"
            />
            <span id="confirm-label" className="text-sm">
              <span className="font-medium">Entiendo las consecuencias.</span>{' '}
              <span className="text-muted-foreground">
                {tieneCoautor === false
                  ? 'La tesis pasará a estado DESISTIDA si mesa de partes aprueba. No podré retomarla.'
                  : tieneCoautor === true
                    ? 'Mi coautor continuará con la tesis si mesa de partes aprueba mi desistimiento.'
                    : 'Esta acción requiere aprobación de mesa de partes y tendrá efecto administrativo permanente.'}
              </span>
            </span>
          </label>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
              {error}
            </div>
          )}

          {/* Mensaje de apoyo */}
          <div className="rounded-lg bg-muted/50 border p-3 flex items-start gap-2 text-xs text-muted-foreground">
            <HeartHandshake className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Sabemos que esta decisión no es fácil. Si necesitas hablar con alguien,
              Bienestar Universitario de UNAMAD está disponible para apoyarte.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!puedeEnviar}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
