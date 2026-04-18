'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ESTADO_SOLICITUD_CONFIG, MOTIVO_COLOR } from '@/components/desistimiento/constants'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Item {
  id: string; thesisId: string; tituloTesis: string; estudiante: string; documento: string;
  carrera: string; facultad: string; motivoCategoria: string; estadoSolicitud: keyof typeof ESTADO_SOLICITUD_CONFIG;
  estadoTesisAlSolicitar: string; teniaCoautor: boolean; solicitadoAt: string;
}

export function ListaDesistimientos() {
  const [estado, setEstado] = useState<string>('PENDIENTE')
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/mesa-partes/desistimientos?estado=${estado}&page=${page}&pageSize=20`)
      .then(r => r.json())
      .then(d => { if (alive) { setItems(d.items); setTotal(d.total) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [estado, page])

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs font-medium">Estado</label>
          <Select value={estado} onValueChange={(v) => { setPage(1); setEstado(v) }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDIENTE">Pendientes</SelectItem>
              <SelectItem value="APROBADO">Aprobados</SelectItem>
              <SelectItem value="RECHAZADO">Rechazados</SelectItem>
              <SelectItem value="CANCELADO">Cancelados</SelectItem>
              <SelectItem value="TODOS">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground ml-auto">Total: {total}</div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">Sin resultados.</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Estudiante</TableHead>
                <TableHead>Carrera</TableHead>
                <TableHead>Tesis</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Coautor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(i => {
                const cfg = ESTADO_SOLICITUD_CONFIG[i.estadoSolicitud]
                return (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs">{new Date(i.solicitadoAt).toLocaleDateString('es-PE')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{i.estudiante}</div>
                      <div className="text-xs text-muted-foreground">{i.documento}</div>
                    </TableCell>
                    <TableCell className="text-sm">{i.carrera}</TableCell>
                    <TableCell className="max-w-xs truncate" title={i.tituloTesis}>{i.tituloTesis}</TableCell>
                    <TableCell>
                      <Badge className={cn(MOTIVO_COLOR[i.motivoCategoria] ?? 'bg-gray-100 text-gray-800', 'text-xs')}>
                        {MOTIVO_LABEL[i.motivoCategoria as keyof typeof MOTIVO_LABEL] ?? i.motivoCategoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{i.estadoTesisAlSolicitar}</TableCell>
                    <TableCell className="text-xs">{i.teniaCoautor ? 'Sí' : 'No'}</TableCell>
                    <TableCell>
                      <Badge className={cn(cfg.bgColor, cfg.color, 'gap-1')}>{cfg.icon}{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/mesa-partes/desistimientos/${i.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
        <span className="text-sm self-center">Página {page}</span>
        <Button variant="outline" disabled={items.length < 20} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
      </div>
    </div>
  )
}
