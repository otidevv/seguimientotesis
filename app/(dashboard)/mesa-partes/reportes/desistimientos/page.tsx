'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReporteDesistimientosDashboard } from '@/components/desistimiento/reporte-dashboard'
import { MOTIVOS_DESISTIMIENTO } from '@/lib/constants/motivos-desistimiento'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Facultad { id: string; nombre: string }

interface ReporteData {
  total: number; conCoautor: number; sinCoautor: number;
  porMotivo: Array<{ key: string; count: number }>;
  porFacultad: Array<{ key: string; count: number }>;
  porEstadoTesis: Array<{ key: string; count: number }>;
}

export default function ReporteDesistimientosPage() {
  // "Hoy" en zona horaria de Perú (UTC-5), para que la fecha del input
  // coincida con el día local del usuario, no con UTC.
  const hoyPeru = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const anioPeru = hoyPeru.slice(0, 4)
  const [desde, setDesde] = useState(`${anioPeru}-01-01`)
  const [hasta, setHasta] = useState(hoyPeru)
  const [facultadId, setFacultadId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [teniaCoautor, setTeniaCoautor] = useState('all')
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [data, setData] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetch('/api/mesa-partes/reporte').then(r => r.json()).then(d => setFacultades(d.facultades ?? []))
  }, [])

  const buildQS = useCallback((formato?: 'xlsx') => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde); if (hasta) p.set('hasta', hasta)
    if (facultadId) p.set('facultadId', facultadId)
    if (motivo) p.append('motivo', motivo)
    if (teniaCoautor !== 'all') p.set('teniaCoautor', teniaCoautor)
    if (formato) p.set('formato', formato)
    return p.toString()
  }, [desde, hasta, facultadId, motivo, teniaCoautor])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mesa-partes/desistimientos/reporte?${buildQS()}`)
      if (!res.ok) throw new Error('Error al cargar')
      setData(await res.json())
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }, [buildQS])

  async function exportar() {
    setExporting(true)
    try {
      const res = await fetch(`/api/mesa-partes/desistimientos/reporte?${buildQS('xlsx')}`)
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `desistimientos-${Date.now()}.xlsx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error') }
    finally { setExporting(false) }
  }

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reporte de desistimientos</h1>
            <p className="text-muted-foreground">Métricas agregadas por rango, motivo y facultad.</p>
          </div>
          <Button onClick={exportar} disabled={exporting || !data}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Exportar Excel
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><Label>Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
            <div><Label>Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
            <div>
              <Label>Facultad</Label>
              <Select value={facultadId || 'all'} onValueChange={v => setFacultadId(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {facultades.map(f => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={motivo || 'all'} onValueChange={v => setMotivo(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {MOTIVOS_DESISTIMIENTO.map(m => <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coautor</Label>
              <Select value={teniaCoautor} onValueChange={setTeniaCoautor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Con coautor</SelectItem>
                  <SelectItem value="false">Autor único</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5 flex justify-end">
              <Button onClick={cargar} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aplicar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {data && <ReporteDesistimientosDashboard {...data} />}
        {!data && loading && (<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>)}
        {!data && !loading && (<div className="py-12 text-center text-muted-foreground">Aplica filtros para ver el reporte.</div>)}
      </div>
    </div>
  )
}
