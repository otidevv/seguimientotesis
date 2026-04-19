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

interface ResolucionVigente { id: string; tipo: string; nombre: string; version: number }

interface Props {
  desistimientoId: string
  thesisId: string
  requiereModificatoria: boolean
  /** Si NO hay coautor que continúe, la tesis pasa a DESISTIDA y no se piden modificatorias. */
  hayCoautorQueContinua: boolean
  resolucionesVigentes: ResolucionVigente[]
  onDone?: () => void
}

export function PanelAprobacionDesistimiento({ desistimientoId, requiereModificatoria, hayCoautorQueContinua, resolucionesVigentes, onDone }: Props) {
  const [aprobarOpen, setAprobarOpen] = useState(false)
  const [rechazarOpen, setRechazarOpen] = useState(false)
  const [archivoJurado, setArchivoJurado] = useState<File | null>(null)
  const [archivoAprob, setArchivoAprob] = useState<File | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tieneJurado = resolucionesVigentes.some(r => r.tipo === 'RESOLUCION_JURADO')
  const tieneAprob = resolucionesVigentes.some(r => r.tipo === 'RESOLUCION_APROBACION')
  const versionJurado = resolucionesVigentes.find(r => r.tipo === 'RESOLUCION_JURADO')?.version

  async function aprobar() {
    setError(null)
    if (requiereModificatoria && tieneJurado && !archivoJurado) {
      setError('Sube la resolución modificatoria de conformación de jurado'); return
    }
    setLoading(true)
    try {
      const form = new FormData()
      if (archivoJurado) form.append('resolucionJuradoModificatoria', archivoJurado)
      if (archivoAprob) form.append('resolucionAprobacionModificatoria', archivoAprob)
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
                No se requiere modificatoria de resoluciones porque el proyecto se cierra.
              </div>
            )}
            {hayCoautorQueContinua && tieneJurado && (
              <div className="space-y-2">
                <Label htmlFor="resJurado">Resolución modificatoria de conformación de jurado (PDF)</Label>
                <Input id="resJurado" type="file" accept="application/pdf" onChange={(e) => setArchivoJurado(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">Reemplaza la v{versionJurado}.</p>
              </div>
            )}
            {hayCoautorQueContinua && tieneAprob && (
              <div className="space-y-2">
                <Label htmlFor="resAprob">Resolución modificatoria de aprobación (PDF, opcional)</Label>
                <Input id="resAprob" type="file" accept="application/pdf" onChange={(e) => setArchivoAprob(e.target.files?.[0] ?? null)} />
              </div>
            )}
            {hayCoautorQueContinua && !tieneJurado && !tieneAprob && (
              <p className="text-sm text-muted-foreground">No hay resoluciones vigentes que requieran modificatoria. Al aprobar, el coautor continuará como autor principal.</p>
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
