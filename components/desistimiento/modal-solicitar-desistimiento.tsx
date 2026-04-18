'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MOTIVOS_DESISTIMIENTO } from '@/lib/constants/motivos-desistimiento'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  thesisId: string
  tituloTesis: string
  onSuccess?: () => void
}

export function ModalSolicitarDesistimiento({ open, onOpenChange, thesisId, tituloTesis, onSuccess }: Props) {
  const [categoria, setCategoria] = useState<string>('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!categoria) { setError('Selecciona un motivo'); return }
    if (descripcion.trim().length < 20) { setError('La descripción debe tener al menos 20 caracteres'); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/tesis/${thesisId}/desistir/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCategoria: categoria, motivoDescripcion: descripcion.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar solicitud')
      toast.success('Solicitud enviada. Mesa de partes revisará tu caso.')
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Solicitar desistimiento de tesis
          </DialogTitle>
          <DialogDescription>
            &ldquo;{tituloTesis}&rdquo; — Tu solicitud será revisada por mesa de partes. Si tienes coautor, él/ella continuará con la tesis; de lo contrario, la tesis quedará dada de baja.
          </DialogDescription>
        </DialogHeader>

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

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción detallada (mínimo 20 caracteres)</Label>
            <Textarea
              id="descripcion"
              rows={5}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Explica brevemente las razones de tu desistimiento..."
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{descripcion.length} caracteres</p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
