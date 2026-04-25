'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, CheckCircle2, XCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  desistimientoId: string
  thesisId: string
  /** True si ya existe RESOLUCION_JURADO emitida — la resolución de desistimiento es obligatoria. */
  requiereResolucionDesistimiento: boolean
  /** Si NO hay coautor que continúe, la tesis pasa a DESISTIDA. Solo informativo en la UI. */
  hayCoautorQueContinua: boolean
  onDone?: () => void
}

export function PanelAprobacionDesistimiento({
  desistimientoId,
  requiereResolucionDesistimiento,
  hayCoautorQueContinua,
  onDone,
}: Props) {
  const [aprobarOpen, setAprobarOpen] = useState(false)
  const [rechazarOpen, setRechazarOpen] = useState(false)
  const [archivoDesistimiento, setArchivoDesistimiento] = useState<File | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function aprobar() {
    setError(null)
    if (requiereResolucionDesistimiento && !archivoDesistimiento) {
      setError('Sube la resolución de desistimiento (PDF). Es obligatoria porque ya existe la resolución de conformación de jurado.')
      return
    }
    setLoading(true)
    try {
      const form = new FormData()
      if (archivoDesistimiento) form.append('resolucionDesistimiento', archivoDesistimiento)
      const res = await fetch(`/api/mesa-partes/desistimientos/${desistimientoId}/aprobar`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      toast.success('Desistimiento aprobado.')
      setAprobarOpen(false)
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function rechazar() {
    setError(null)
    if (motivoRechazo.trim().length < 10) { setError('Mínimo 10 caracteres'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/mesa-partes/desistimientos/${desistimientoId}/rechazar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRechazo: motivoRechazo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      toast.success('Solicitud rechazada.')
      setRechazarOpen(false)
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Decisión de mesa de partes</CardTitle></CardHeader>
      <CardContent className="flex gap-3">
        <Button onClick={() => setAprobarOpen(true)} className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-4 h-4 mr-2" />Aprobar
        </Button>
        <Button onClick={() => setRechazarOpen(true)} variant="destructive">
          <XCircle className="w-4 h-4 mr-2" />Rechazar
        </Button>
      </CardContent>

      <Dialog open={aprobarOpen} onOpenChange={(v) => !loading && setAprobarOpen(v)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Aprobar desistimiento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!hayCoautorQueContinua && (
              <div className="rounded-md border border-red-300 bg-red-50/60 dark:bg-red-950/30 p-3 text-sm text-red-900 dark:text-red-100">
                El tesista es <strong>autor único</strong>. Al aprobar, la tesis pasará a <strong>DESISTIDA</strong> y se dará de baja.
              </div>
            )}
            {requiereResolucionDesistimiento ? (
              <div className="space-y-2">
                <Label htmlFor="resDesistimiento">
                  Resolución de desistimiento (PDF) <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="resDesistimiento"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setArchivoDesistimiento(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Obligatoria: ya existe resolución de conformación de jurado. La resolución de jurado <strong>no se reemplaza</strong>; la de desistimiento se agrega como documento aparte.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="resDesistimiento">
                  Resolución de desistimiento (PDF, opcional)
                </Label>
                <Input
                  id="resDesistimiento"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setArchivoDesistimiento(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Aún no hay resolución de jurado emitida, así que adjuntarla es opcional.
                </p>
              </div>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobarOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={aprobar} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rechazarOpen} onOpenChange={(v) => !loading && setRechazarOpen(v)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Rechazar solicitud</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo del rechazo (mínimo 10 caracteres)</Label>
            <Textarea id="motivo" rows={4} value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} />
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarOpen(false)} disabled={loading}>Cancelar</Button>
            <Button variant="destructive" onClick={rechazar} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
