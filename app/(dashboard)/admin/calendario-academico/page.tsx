'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2, CalendarDays, ChevronRight, Power, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type Semestre = 'I' | 'II' | 'VERANO'
type Estado = 'PLANIFICADO' | 'ACTIVO' | 'CERRADO'
type WindowType =
  | 'PRESENTACION_PROYECTO' | 'REVISION_MESA_PARTES' | 'ASIGNACION_JURADOS'
  | 'EVALUACION_JURADO' | 'INFORME_FINAL' | 'SUSTENTACION' | 'DESISTIMIENTO'

const TIPOS: WindowType[] = [
  'PRESENTACION_PROYECTO', 'REVISION_MESA_PARTES', 'ASIGNACION_JURADOS',
  'EVALUACION_JURADO', 'INFORME_FINAL', 'SUSTENTACION', 'DESISTIMIENTO',
]

const TIPO_LABEL: Record<WindowType, string> = {
  PRESENTACION_PROYECTO: 'Presentacion de proyecto',
  REVISION_MESA_PARTES: 'Revision mesa de partes',
  ASIGNACION_JURADOS: 'Asignacion de jurados',
  EVALUACION_JURADO: 'Evaluacion de jurados',
  INFORME_FINAL: 'Informe final',
  SUSTENTACION: 'Sustentacion',
  DESISTIMIENTO: 'Desistimiento',
}

interface Periodo {
  id: string
  anio: number
  semestre: Semestre
  nombre: string
  fechaInicio: string
  fechaFin: string
  estado: Estado
  esActual: boolean
  facultadId: string | null
  facultad: { id: string; nombre: string; codigo: string } | null
  observaciones: string | null
  _count: { ventanas: number }
}

interface Ventana {
  id: string
  tipo: WindowType
  fechaInicio: string
  fechaFin: string
  habilitada: boolean
  facultadId: string | null
  facultad: { id: string; nombre: string; codigo: string } | null
  observaciones: string | null
  _count: { overrides: number }
}

interface PeriodoDetalle extends Periodo {
  ventanas: Ventana[]
}

function isoDate(s: string) {
  return new Date(s).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })
}

function toInputValue(s: string) {
  // yyyy-mm-dd para input date en America/Lima
  const d = new Date(s)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

function fromInputValue(s: string, endOfDay = false) {
  // input yyyy-mm-dd en zona Lima (UTC-5)
  const hora = endOfDay ? '23:59:59' : '00:00:00'
  return new Date(`${s}T${hora}-05:00`).toISOString()
}

export default function CalendarioAcademicoPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<PeriodoDetalle | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)

  const [crearPeriodoOpen, setCrearPeriodoOpen] = useState(false)
  const [editPeriodo, setEditPeriodo] = useState<Periodo | null>(null)
  const [crearVentanaOpen, setCrearVentanaOpen] = useState(false)
  const [editVentana, setEditVentana] = useState<Ventana | null>(null)
  const [overridesVentana, setOverridesVentana] = useState<Ventana | null>(null)

  const loadPeriodos = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/calendario-academico/periodos')
      const d: { periodos?: Periodo[]; error?: string } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      setPeriodos(d.periodos ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando periodos')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetalle = useCallback(async (id: string) => {
    setDetalleLoading(true)
    try {
      const r = await fetch(`/api/admin/calendario-academico/periodos/${id}`)
      const d: { periodo?: PeriodoDetalle; error?: string } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      setDetalle(d.periodo ?? null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setDetalleLoading(false)
    }
  }, [])

  useEffect(() => { loadPeriodos() }, [loadPeriodos])
  useEffect(() => {
    if (expandedId) loadDetalle(expandedId)
    else setDetalle(null)
  }, [expandedId, loadDetalle])

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6" /> Calendario academico
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona periodos academicos y ventanas de tramite. Las ventanas fuera de plazo
            bloquean acciones de tesistas y mesa de partes.
          </p>
        </div>
        <Button onClick={() => setCrearPeriodoOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo periodo
        </Button>
      </div>

      {(() => {
        // Warning: periodo ACTIVO global termina pronto y no hay siguiente
        // PLANIFICADO. Los plazos de jurados/correcciones podrian no saltar
        // correctamente las vacaciones si no hay calendario futuro configurado.
        const ahora = new Date()
        const globales = periodos.filter((p) => p.facultadId === null)
        const activoGlobal = globales.find((p) => p.estado === 'ACTIVO')
        if (!activoGlobal) return null
        const fin = new Date(activoGlobal.fechaFin)
        const diasParaFin = Math.ceil((fin.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000))
        if (diasParaFin > 30) return null
        const hayFuturo = globales.some(
          (p) => p.id !== activoGlobal.id &&
            (p.estado === 'PLANIFICADO' || p.estado === 'ACTIVO') &&
            new Date(p.fechaInicio) > fin,
        )
        if (hayFuturo) return null
        return (
          <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="py-3 text-sm flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  El periodo global <b>{activoGlobal.nombre}</b> termina en {diasParaFin} dia{diasParaFin === 1 ? '' : 's'}
                  {' '}y no hay un periodo siguiente configurado.
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  Los plazos de jurados y correcciones que se calculen ahora podrian no saltar
                  correctamente las vacaciones. Crea el siguiente periodo (PLANIFICADO) antes de que termine este.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      <Card>
        <CardHeader>
          <CardTitle>Periodos</CardTitle>
          <CardDescription>Haz clic en un periodo para ver y configurar sus ventanas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : periodos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Aun no hay periodos registrados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Nombre</TableHead>
                  <TableHead>Facultad</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ventanas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodos.map((p) => (
                  <TableRow
                    key={p.id}
                    className={cn('cursor-pointer', expandedId === p.id && 'bg-muted/40')}
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    <TableCell>
                      <ChevronRight className={cn('w-4 h-4 transition-transform', expandedId === p.id && 'rotate-90')} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.nombre}
                      {p.esActual && <Badge variant="outline" className="ml-2 border-emerald-400 text-emerald-700">Actual</Badge>}
                    </TableCell>
                    <TableCell>{p.facultad?.codigo ?? <span className="text-muted-foreground">Global</span>}</TableCell>
                    <TableCell className="text-sm">{isoDate(p.fechaInicio)} — {isoDate(p.fechaFin)}</TableCell>
                    <TableCell>
                      <Badge variant={p.estado === 'ACTIVO' ? 'default' : p.estado === 'CERRADO' ? 'destructive' : 'secondary'}>
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>{p._count.ventanas}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm" variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setEditPeriodo(p) }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {expandedId && detalle && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Ventanas de {detalle.nombre}</CardTitle>
              <CardDescription>Define cuando cada tramite esta abierto.</CardDescription>
            </div>
            <Button onClick={() => setCrearVentanaOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Nueva ventana
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {detalleLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : detalle.ventanas.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Este periodo aun no tiene ventanas configuradas.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tramite</TableHead>
                    <TableHead>Facultad</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Habilitada</TableHead>
                    <TableHead>Overrides</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalle.ventanas.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{TIPO_LABEL[v.tipo]}</TableCell>
                      <TableCell>{v.facultad?.codigo ?? <span className="text-muted-foreground">Global</span>}</TableCell>
                      <TableCell className="text-sm">{isoDate(v.fechaInicio)} — {isoDate(v.fechaFin)}</TableCell>
                      <TableCell>
                        <Badge variant={v.habilitada ? 'default' : 'secondary'}>{v.habilitada ? 'Si' : 'No'}</Badge>
                      </TableCell>
                      <TableCell>{v._count.overrides}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" title="Prorrogas" onClick={() => setOverridesVentana(v)}>
                          <ShieldAlert className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditVentana(v)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={async () => {
                            if (!confirm('Eliminar esta ventana?')) return
                            const r = await fetch(`/api/admin/calendario-academico/ventanas/${v.id}`, { method: 'DELETE' })
                            if (!r.ok) { toast.error('Error al eliminar'); return }
                            toast.success('Ventana eliminada')
                            loadDetalle(detalle.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <PeriodoDialog
        open={crearPeriodoOpen}
        onOpenChange={setCrearPeriodoOpen}
        onSaved={(nuevoId) => {
          setCrearPeriodoOpen(false)
          loadPeriodos()
          if (nuevoId) setExpandedId(nuevoId) // expandir el periodo recien creado
        }}
        periodosExistentes={periodos}
      />

      {editPeriodo && (
        <PeriodoDialog
          open
          periodo={editPeriodo}
          onOpenChange={(open) => { if (!open) setEditPeriodo(null) }}
          onSaved={() => { setEditPeriodo(null); loadPeriodos(); if (expandedId) loadDetalle(expandedId) }}
          periodosExistentes={periodos}
        />
      )}

      {crearVentanaOpen && detalle && (
        <VentanaDialog
          open
          periodoId={detalle.id}
          tiposUsados={detalle.ventanas.map((v) => v.tipo)}
          onOpenChange={(open) => { if (!open) setCrearVentanaOpen(false) }}
          onSaved={() => { setCrearVentanaOpen(false); loadDetalle(detalle.id); loadPeriodos() }}
        />
      )}

      {editVentana && (
        <VentanaDialog
          open
          periodoId={detalle?.id ?? ''}
          ventana={editVentana}
          onOpenChange={(open) => { if (!open) setEditVentana(null) }}
          onSaved={() => { setEditVentana(null); if (detalle) loadDetalle(detalle.id); loadPeriodos() }}
        />
      )}

      {overridesVentana && (
        <OverridesDialog
          open
          ventana={overridesVentana}
          onOpenChange={(open) => { if (!open) setOverridesVentana(null) }}
          onChanged={() => { if (detalle) loadDetalle(detalle.id) }}
        />
      )}
    </div>
  )
}

// ---------- Dialog: crear / editar periodo ----------

interface PeriodoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (nuevoId?: string) => void
  periodo?: Periodo
  periodosExistentes?: Periodo[]
}
type VentanasInit = 'defecto' | 'copiar' | 'ninguna'
function PeriodoDialog({ open, onOpenChange, onSaved, periodo, periodosExistentes = [] }: PeriodoDialogProps) {
  const editing = Boolean(periodo)
  const [anio, setAnio] = useState(periodo?.anio ?? new Date().getFullYear())
  const [semestre, setSemestre] = useState<Semestre>(periodo?.semestre ?? 'I')
  const [nombre, setNombre] = useState(periodo?.nombre ?? `${new Date().getFullYear()}-I`)
  const [fechaInicio, setFechaInicio] = useState(periodo ? toInputValue(periodo.fechaInicio) : '')
  const [fechaFin, setFechaFin] = useState(periodo ? toInputValue(periodo.fechaFin) : '')
  const [estado, setEstado] = useState<Estado>(periodo?.estado ?? 'PLANIFICADO')
  const [esActual, setEsActual] = useState(periodo?.esActual ?? false)
  const [observaciones, setObservaciones] = useState(periodo?.observaciones ?? '')
  const [ventanasInit, setVentanasInit] = useState<VentanasInit>('defecto')
  const [copiarDePeriodoId, setCopiarDePeriodoId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Candidatos para "copiar de": periodos globales (facultadId null) con ventanas.
  // TODO: si el admin configura periodos por facultad, agregar filtro por scope.
  const candidatosCopia = periodosExistentes.filter(
    (p) => p.facultadId === null && p._count.ventanas > 0 && p.id !== periodo?.id,
  )

  async function guardar() {
    if (!fechaInicio || !fechaFin) { toast.error('Fechas obligatorias'); return }
    if (!editing && ventanasInit === 'copiar' && !copiarDePeriodoId) {
      toast.error('Selecciona un periodo del cual copiar ventanas')
      return
    }
    setSaving(true)
    try {
      const body = editing
        ? {
            nombre, estado, esActual,
            fechaInicio: fromInputValue(fechaInicio),
            fechaFin: fromInputValue(fechaFin, true),
            observaciones: observaciones || null,
          }
        : {
            anio, semestre, nombre,
            fechaInicio: fromInputValue(fechaInicio),
            fechaFin: fromInputValue(fechaFin, true),
            estado, esActual,
            observaciones: observaciones || undefined,
            ventanasInit,
            copiarDePeriodoId: ventanasInit === 'copiar' ? copiarDePeriodoId : undefined,
          }
      const url = editing
        ? `/api/admin/calendario-academico/periodos/${periodo!.id}`
        : `/api/admin/calendario-academico/periodos`
      const r = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d: { error?: string; periodo?: { id: string }; ventanasCreadas?: number } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      if (editing) {
        toast.success('Periodo actualizado')
      } else {
        const extra = d.ventanasCreadas ? ` y ${d.ventanasCreadas} ventanas` : ''
        toast.success(`Periodo creado${extra}`)
      }
      onSaved(d.periodo?.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar periodo' : 'Nuevo periodo'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Modifica fechas, estado o vigencia.' : 'Crea un periodo academico global o por facultad.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {!editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Anio</Label>
                <Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
              </div>
              <div>
                <Label>Semestre</Label>
                <Select value={semestre} onValueChange={(v) => setSemestre(v as Semestre)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">I</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="VERANO">Verano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div>
            <Label>Nombre mostrado</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="2026-I" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha inicio</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <Label>Fecha fin</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as Estado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANIFICADO">Planificado</SelectItem>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="CERRADO">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={esActual} onCheckedChange={setEsActual} id="esActual" />
              <Label htmlFor="esActual" className="cursor-pointer">Es periodo actual</Label>
            </div>
          </div>
          <div>
            <Label>Observaciones (opcional)</Label>
            <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
          </div>

          {!editing && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <Label className="text-sm font-medium">Ventanas iniciales</Label>
              <p className="text-xs text-muted-foreground">
                Ahorra tiempo auto-creando las 7 ventanas del periodo. Puedes ajustar fechas individuales despues.
              </p>
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio" name="ventanasInit"
                    className="mt-0.5"
                    checked={ventanasInit === 'defecto'}
                    onChange={() => setVentanasInit('defecto')}
                  />
                  <div>
                    <div className="text-sm">Crear 7 ventanas por defecto</div>
                    <div className="text-xs text-muted-foreground">Cada ventana cubre el rango completo del periodo. Ajustas fechas despues.</div>
                  </div>
                </label>

                <label className={cn('flex items-start gap-2', candidatosCopia.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}>
                  <input
                    type="radio" name="ventanasInit"
                    className="mt-0.5"
                    disabled={candidatosCopia.length === 0}
                    checked={ventanasInit === 'copiar'}
                    onChange={() => setVentanasInit('copiar')}
                  />
                  <div className="flex-1">
                    <div className="text-sm">Copiar ventanas de un periodo anterior</div>
                    <div className="text-xs text-muted-foreground">
                      {candidatosCopia.length === 0
                        ? 'No hay periodos con ventanas configuradas aun.'
                        : 'Copia las ventanas del periodo elegido, desplazando las fechas por el offset entre inicios.'}
                    </div>
                    {ventanasInit === 'copiar' && candidatosCopia.length > 0 && (
                      <Select value={copiarDePeriodoId} onValueChange={setCopiarDePeriodoId}>
                        <SelectTrigger className="mt-2 h-8 text-sm"><SelectValue placeholder="Selecciona periodo..." /></SelectTrigger>
                        <SelectContent>
                          {candidatosCopia.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre} ({p._count.ventanas} ventanas)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio" name="ventanasInit"
                    className="mt-0.5"
                    checked={ventanasInit === 'ninguna'}
                    onChange={() => setVentanasInit('ninguna')}
                  />
                  <div>
                    <div className="text-sm">No crear ventanas</div>
                    <div className="text-xs text-muted-foreground">Las creo manualmente despues.</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Dialog: crear / editar ventana ----------

interface VentanaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  periodoId: string
  ventana?: Ventana
  tiposUsados?: WindowType[]
}
function VentanaDialog({ open, onOpenChange, onSaved, periodoId, ventana, tiposUsados = [] }: VentanaDialogProps) {
  const editing = Boolean(ventana)
  const disponibles = TIPOS.filter((t) => !tiposUsados.includes(t) || t === ventana?.tipo)
  const [tipo, setTipo] = useState<WindowType>(ventana?.tipo ?? disponibles[0] ?? 'PRESENTACION_PROYECTO')
  const [fechaInicio, setFechaInicio] = useState(ventana ? toInputValue(ventana.fechaInicio) : '')
  const [fechaFin, setFechaFin] = useState(ventana ? toInputValue(ventana.fechaFin) : '')
  const [habilitada, setHabilitada] = useState(ventana?.habilitada ?? true)
  const [observaciones, setObservaciones] = useState(ventana?.observaciones ?? '')
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!fechaInicio || !fechaFin) { toast.error('Fechas obligatorias'); return }
    setSaving(true)
    try {
      const url = editing
        ? `/api/admin/calendario-academico/ventanas/${ventana!.id}`
        : `/api/admin/calendario-academico/ventanas`
      const body = editing
        ? {
            fechaInicio: fromInputValue(fechaInicio),
            fechaFin: fromInputValue(fechaFin, true),
            habilitada,
            observaciones: observaciones || null,
          }
        : {
            periodoId, tipo, habilitada,
            fechaInicio: fromInputValue(fechaInicio),
            fechaFin: fromInputValue(fechaFin, true),
            observaciones: observaciones || undefined,
          }
      const r = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d: { error?: string } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      toast.success(editing ? 'Ventana actualizada' : 'Ventana creada')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar ventana' : 'Nueva ventana'}</DialogTitle>
          <DialogDescription>
            Las fechas se interpretan en zona horaria America/Lima (UTC-5).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {!editing ? (
            <div>
              <Label>Tramite</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as WindowType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {disponibles.map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="text-muted-foreground text-xs">Tramite</Label>
              <p className="font-medium">{TIPO_LABEL[ventana!.tipo]}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha inicio</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <Label>Fecha fin</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={habilitada} onCheckedChange={setHabilitada} id="habilitada" />
            <Label htmlFor="habilitada" className="cursor-pointer flex items-center gap-1">
              <Power className="w-3.5 h-3.5" /> Habilitada
            </Label>
          </div>
          <div>
            <Label>Observaciones (opcional)</Label>
            <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Dialog: overrides / prorrogas excepcionales ----------

type OverrideCategoria = 'CASO_FORTUITO' | 'FUERZA_MAYOR' | 'ERROR_ADMINISTRATIVO' | 'REPRESENTANTE_OFICIAL' | 'OTRO'

const CATEGORIA_LABEL: Record<OverrideCategoria, string> = {
  CASO_FORTUITO: 'Caso fortuito',
  FUERZA_MAYOR: 'Fuerza mayor',
  ERROR_ADMINISTRATIVO: 'Error administrativo',
  REPRESENTANTE_OFICIAL: 'Representante oficial',
  OTRO: 'Otro',
}
const CATEGORIA_DESC: Record<OverrideCategoria, string> = {
  CASO_FORTUITO: 'Enfermedad, accidente u otro caso individual.',
  FUERZA_MAYOR: 'Paro, pandemia, desastre o causa externa colectiva.',
  ERROR_ADMINISTRATIVO: 'Error del sistema o de mesa de partes.',
  REPRESENTANTE_OFICIAL: 'Comision oficial o representacion de la universidad.',
  OTRO: 'Otra causa no tipificada.',
}
const CATEGORIAS: OverrideCategoria[] = ['CASO_FORTUITO', 'FUERZA_MAYOR', 'ERROR_ADMINISTRATIVO', 'REPRESENTANTE_OFICIAL', 'OTRO']

interface OverrideItem {
  id: string
  thesisId: string | null
  userId: string | null
  categoria: OverrideCategoria
  motivo: string
  vigenciaHasta: string
  createdAt: string
  thesis: { id: string; titulo: string } | null
  user: { id: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; numeroDocumento: string } | null
  autorizadoPor: { id: string; nombres: string; apellidoPaterno: string } | null
}

interface TesisBusquedaResult {
  id: string
  titulo: string
  estado: string
  autores: Array<{ nombreCompleto: string; documento: string; codigo: string; facultadCodigo: string }>
}
interface UserBusquedaResult {
  id: string
  nombreCompleto: string
  documento: string
  email: string
  roles: string[]
}

type Scope = 'tesis' | 'usuario' | 'general'

interface OverridesDialogProps {
  open: boolean
  ventana: Ventana
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}
function OverridesDialog({ open, ventana, onOpenChange, onChanged }: OverridesDialogProps) {
  const [overrides, setOverrides] = useState<OverrideItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'crear' | 'vigentes' | 'expiradas'>('crear')
  const [editando, setEditando] = useState<OverrideItem | null>(null)

  // Form state
  const [scope, setScope] = useState<Scope>('tesis')
  const [tesisSel, setTesisSel] = useState<TesisBusquedaResult | null>(null)
  const [userSel, setUserSel] = useState<UserBusquedaResult | null>(null)
  const [categoria, setCategoria] = useState<OverrideCategoria>('CASO_FORTUITO')
  const [motivo, setMotivo] = useState('')
  const [vigenciaHasta, setVigenciaHasta] = useState('')
  const [saving, setSaving] = useState(false)

  // Busqueda
  const [qTesis, setQTesis] = useState('')
  const [resTesis, setResTesis] = useState<TesisBusquedaResult[]>([])
  const [buscandoTesis, setBuscandoTesis] = useState(false)
  const [qUser, setQUser] = useState('')
  const [resUser, setResUser] = useState<UserBusquedaResult[]>([])
  const [buscandoUser, setBuscandoUser] = useState(false)

  const resetForm = useCallback(() => {
    setEditando(null)
    setScope('tesis')
    setTesisSel(null); setUserSel(null)
    setCategoria('CASO_FORTUITO')
    setMotivo('')
    setVigenciaHasta('')
    setQTesis(''); setResTesis([])
    setQUser(''); setResUser([])
    setTab('crear') // al reabrir el dialog, siempre arrancar en el form
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/calendario-academico/overrides?windowId=${ventana.id}`)
      const d: { overrides?: OverrideItem[]; error?: string } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      setOverrides(d.overrides ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [ventana.id])

  useEffect(() => { if (open) { load(); resetForm() } }, [open, load, resetForm])

  // Debounce busqueda tesis
  useEffect(() => {
    if (scope !== 'tesis' || qTesis.trim().length < 2) { setResTesis([]); return }
    const ac = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoTesis(true)
      try {
        const r = await fetch(`/api/admin/tesis/buscar?q=${encodeURIComponent(qTesis)}`, { signal: ac.signal })
        const d: { tesis?: TesisBusquedaResult[] } = await r.json()
        if (!ac.signal.aborted) setResTesis(d.tesis ?? [])
      } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) console.error(e) }
      finally { if (!ac.signal.aborted) setBuscandoTesis(false) }
    }, 250)
    return () => { ac.abort(); clearTimeout(t) }
  }, [qTesis, scope])

  // Debounce busqueda user
  useEffect(() => {
    if (scope !== 'usuario' || qUser.trim().length < 2) { setResUser([]); return }
    const ac = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoUser(true)
      try {
        const r = await fetch(`/api/admin/users/buscar?q=${encodeURIComponent(qUser)}`, { signal: ac.signal })
        const d: { users?: UserBusquedaResult[] } = await r.json()
        if (!ac.signal.aborted) setResUser(d.users ?? [])
      } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) console.error(e) }
      finally { if (!ac.signal.aborted) setBuscandoUser(false) }
    }, 250)
    return () => { ac.abort(); clearTimeout(t) }
  }, [qUser, scope])

  function quickChip(days: number) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setVigenciaHasta(d.toISOString().slice(0, 10))
  }
  function quickFinVentana() {
    setVigenciaHasta(new Date(ventana.fechaFin).toISOString().slice(0, 10))
  }

  function startEdit(o: OverrideItem) {
    setEditando(o)
    // Limpiamos ambos selects antes de setear el que aplica, para no dejar
    // residuales de ediciones previas cuando scope=general.
    setTesisSel(null); setUserSel(null)
    if (o.thesisId && o.thesis) {
      setScope('tesis')
      setTesisSel({ id: o.thesisId, titulo: o.thesis.titulo, estado: '', autores: [] })
    } else if (o.userId && o.user) {
      setScope('usuario')
      setUserSel({
        id: o.userId,
        nombreCompleto: `${o.user.apellidoPaterno} ${o.user.apellidoMaterno}, ${o.user.nombres}`,
        documento: o.user.numeroDocumento, email: '', roles: [],
      })
    } else {
      setScope('general')
    }
    setCategoria(o.categoria)
    setMotivo(o.motivo)
    // toInputValue respeta zona America/Lima; usar toISOString().slice(0,10)
    // desfasa un dia cuando la hora esta cerca de medianoche (23:59 UTC-5).
    setVigenciaHasta(toInputValue(o.vigenciaHasta))
    setTab('crear')
  }

  async function guardar() {
    if (motivo.trim().length < 10) { toast.error('Motivo minimo 10 caracteres'); return }
    if (!vigenciaHasta) { toast.error('Fecha de vigencia requerida'); return }
    if (scope === 'tesis' && !tesisSel) { toast.error('Selecciona una tesis'); return }
    if (scope === 'usuario' && !userSel) { toast.error('Selecciona un usuario'); return }
    setSaving(true)
    try {
      if (editando) {
        const r = await fetch(`/api/admin/calendario-academico/overrides/${editando.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoria, motivo: motivo.trim(),
            vigenciaHasta: fromInputValue(vigenciaHasta, true),
          }),
        })
        const d: { error?: string } = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Error')
        toast.success('Prorroga actualizada')
      } else {
        const r = await fetch('/api/admin/calendario-academico/overrides', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            windowId: ventana.id,
            thesisId: scope === 'tesis' ? tesisSel!.id : null,
            userId: scope === 'usuario' ? userSel!.id : null,
            categoria, motivo: motivo.trim(),
            vigenciaHasta: fromInputValue(vigenciaHasta, true),
          }),
        })
        const d: { error?: string } = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Error')
        toast.success('Prorroga creada')
      }
      resetForm()
      setTab('vigentes')
      load()
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id: string) {
    if (!confirm('Eliminar esta prorroga?')) return
    const r = await fetch(`/api/admin/calendario-academico/overrides/${id}`, { method: 'DELETE' })
    if (!r.ok) { toast.error('Error al eliminar'); return }
    toast.success('Prorroga eliminada')
    load()
    onChanged()
  }

  const ahora = new Date()
  const vigentes = overrides.filter((o) => new Date(o.vigenciaHasta) >= ahora)
  const expiradas = overrides.filter((o) => new Date(o.vigenciaHasta) < ahora)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Prorrogas — {TIPO_LABEL[ventana.tipo]}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 text-xs">
            <span>Ventana original: <b>{isoDate(ventana.fechaInicio)} — {isoDate(ventana.fechaFin)}</b></span>
            <Badge variant={ventana.habilitada ? 'default' : 'secondary'} className="text-[10px]">
              {ventana.habilitada ? 'Habilitada' : 'Deshabilitada'}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="crear">{editando ? 'Editando' : 'Crear nueva'}</TabsTrigger>
            <TabsTrigger value="vigentes">Vigentes ({vigentes.length})</TabsTrigger>
            <TabsTrigger value="expiradas">Expiradas ({expiradas.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="crear" className="flex-1 overflow-y-auto pr-1 space-y-4 pt-3">
            {editando && (
              <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-2 text-xs flex items-center justify-between">
                <span>Editando prorroga #{editando.id.slice(-6)}. El scope (tesis/usuario/general) no se puede cambiar.</span>
                <Button size="sm" variant="ghost" onClick={resetForm}>Cancelar</Button>
              </div>
            )}

            {/* Scope selector */}
            <div className="space-y-2">
              <Label className="text-xs">Aplicar a</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                {(['tesis', 'usuario', 'general'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={Boolean(editando)}
                    onClick={() => {
                      setScope(s)
                      // Limpiar seleccion y busqueda del scope anterior para no
                      // dejar residuales.
                      setTesisSel(null); setUserSel(null)
                      setQTesis(''); setResTesis([])
                      setQUser(''); setResUser([])
                    }}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      scope === s ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      editando && 'opacity-60 cursor-not-allowed',
                    )}
                  >
                    {s === 'tesis' ? 'Tesis especifica' : s === 'usuario' ? 'Usuario especifico' : 'General (todos)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Buscador segun scope */}
            {scope === 'tesis' && !editando && (
              <div className="space-y-2">
                {tesisSel ? (
                  <div className="rounded-md border p-2 text-sm flex items-start justify-between gap-2 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300">
                    <div className="flex-1">
                      <div className="font-medium">{tesisSel.titulo}</div>
                      {tesisSel.autores[0] && (
                        <div className="text-xs text-muted-foreground">
                          {tesisSel.autores[0].nombreCompleto} — {tesisSel.autores[0].codigo} — {tesisSel.autores[0].facultadCodigo}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setTesisSel(null)}>Cambiar</Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Buscar por titulo, DNI, codigo o nombre de autor..."
                      value={qTesis}
                      onChange={(e) => setQTesis(e.target.value)}
                    />
                    {buscandoTesis && <p className="text-xs text-muted-foreground">Buscando...</p>}
                    {!buscandoTesis && qTesis.length >= 2 && resTesis.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin resultados.</p>
                    )}
                    {resTesis.length > 0 && (
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {resTesis.map((t) => (
                          <button
                            key={t.id} type="button"
                            onClick={() => { setTesisSel(t); setQTesis(''); setResTesis([]) }}
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-0 cursor-pointer"
                          >
                            <div className="font-medium line-clamp-1">{t.titulo}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.autores[0]?.nombreCompleto ?? 'sin autor activo'} — {t.estado}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {scope === 'usuario' && !editando && (
              <div className="space-y-2">
                {userSel ? (
                  <div className="rounded-md border p-2 text-sm flex items-start justify-between gap-2 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300">
                    <div className="flex-1">
                      <div className="font-medium">{userSel.nombreCompleto}</div>
                      <div className="text-xs text-muted-foreground">DNI {userSel.documento}{userSel.email ? ` — ${userSel.email}` : ''}</div>
                      {userSel.roles.length > 0 && (
                        <div className="text-[10px] mt-1 flex gap-1 flex-wrap">
                          {userSel.roles.map((r) => <Badge key={r} variant="outline" className="text-[9px] px-1 py-0 h-4">{r}</Badge>)}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setUserSel(null)}>Cambiar</Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Buscar por nombre, apellido, DNI o email..."
                      value={qUser}
                      onChange={(e) => setQUser(e.target.value)}
                    />
                    {buscandoUser && <p className="text-xs text-muted-foreground">Buscando...</p>}
                    {!buscandoUser && qUser.length >= 2 && resUser.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin resultados.</p>
                    )}
                    {resUser.length > 0 && (
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {resUser.map((u) => (
                          <button
                            key={u.id} type="button"
                            onClick={() => { setUserSel(u); setQUser(''); setResUser([]) }}
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-0 cursor-pointer"
                          >
                            <div className="font-medium">{u.nombreCompleto}</div>
                            <div className="text-xs text-muted-foreground">
                              DNI {u.documento} — {u.email}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {scope === 'general' && !editando && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100">
                <div className="font-medium flex items-center gap-1"><AlertTriangleIcon /> Prorroga general</div>
                <p className="mt-1">Afectara a <b>todas las tesis/usuarios</b> que intenten la accion mientras la prorroga este vigente. Usalo solo para casos de fuerza mayor colectiva.</p>
              </div>
            )}

            {/* Categoría */}
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as OverrideCategoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{CATEGORIA_DESC[categoria]}</p>
            </div>

            {/* Motivo */}
            <div className="space-y-1">
              <Label className="text-xs">Motivo / justificacion (minimo 10 caracteres)</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ej: Resolucion rectoral 0123-2026 por paro de transporte del 10-15 abril." />
              <p className="text-[11px] text-muted-foreground">{motivo.length} caracteres</p>
            </div>

            {/* Vigencia con chips */}
            <div className="space-y-2">
              <Label className="text-xs">Vigencia hasta</Label>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickChip(3)}>+3 días</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickChip(7)}>+1 semana</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickChip(15)}>+15 días</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickChip(30)}>+1 mes</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={quickFinVentana}>Fin de ventana</Button>
              </div>
              <Input type="date" value={vigenciaHasta} onChange={(e) => setVigenciaHasta(e.target.value)} />
              {vigenciaHasta && new Date(vigenciaHasta) > new Date(ventana.fechaFin) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  La vigencia excede el fin de la ventana original ({isoDate(ventana.fechaFin)}).
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editando && <Button variant="outline" onClick={resetForm}>Cancelar edicion</Button>}
              <Button onClick={guardar} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editando ? 'Guardar cambios' : 'Crear prorroga'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="vigentes" className="flex-1 overflow-y-auto pr-1 pt-3">
            {loading
              ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              : <OverridesLista overrides={vigentes} onEdit={startEdit} onDelete={eliminar} ventanaFechaFin={new Date(ventana.fechaFin)} />}
          </TabsContent>

          <TabsContent value="expiradas" className="flex-1 overflow-y-auto pr-1 pt-3">
            {loading
              ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              : <OverridesLista overrides={expiradas} onDelete={eliminar} readonly ventanaFechaFin={new Date(ventana.fechaFin)} />}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AlertTriangleIcon() {
  // Inline tiny triangle icon to evitar importar otro lucide en este archivo
  return <span className="inline-block w-3 h-3 text-amber-600">⚠</span>
}

interface OverridesListaProps {
  overrides: OverrideItem[]
  onEdit?: (o: OverrideItem) => void
  onDelete: (id: string) => void
  readonly?: boolean
  ventanaFechaFin: Date
}
function OverridesLista({ overrides, onEdit, onDelete, readonly, ventanaFechaFin }: OverridesListaProps) {
  if (overrides.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sin prorrogas en esta lista.</p>
  }
  const ahora = new Date()
  return (
    <div className="space-y-2">
      {overrides.map((o) => {
        const vig = new Date(o.vigenciaHasta)
        const diasRest = Math.ceil((vig.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000))
        const excedeVentana = vig > ventanaFechaFin
        return (
          <div key={o.id} className="rounded-md border p-3 text-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{CATEGORIA_LABEL[o.categoria]}</Badge>
                {o.thesis && <Badge className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">Tesis</Badge>}
                {o.user && <Badge className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200">Usuario</Badge>}
                {!o.thesis && !o.user && <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">General</Badge>}
                {diasRest >= 0 && <span className="text-[11px] text-muted-foreground">{diasRest === 0 ? 'vence hoy' : `${diasRest} dia${diasRest === 1 ? '' : 's'} restantes`}</span>}
                {diasRest < 0 && <span className="text-[11px] text-muted-foreground">expiro hace {-diasRest} dia{-diasRest === 1 ? '' : 's'}</span>}
              </div>
              <div className="flex gap-1">
                {!readonly && onEdit && (
                  <Button size="sm" variant="ghost" onClick={() => onEdit(o)} title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onDelete(o.id)} title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </Button>
              </div>
            </div>
            {o.thesis && (
              <div className="text-xs"><span className="text-muted-foreground">Tesis:</span> {o.thesis.titulo}</div>
            )}
            {o.user && (
              <div className="text-xs">
                <span className="text-muted-foreground">Usuario:</span> {o.user.apellidoPaterno} {o.user.apellidoMaterno}, {o.user.nombres} (DNI {o.user.numeroDocumento})
              </div>
            )}
            <div className="text-xs whitespace-pre-wrap">{o.motivo}</div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Hasta <b>{new Date(o.vigenciaHasta).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</b>
                {excedeVentana && <span className="text-amber-700 dark:text-amber-300 ml-1">(excede fin de ventana)</span>}
              </span>
              {o.autorizadoPor && <span>por {o.autorizadoPor.apellidoPaterno}, {o.autorizadoPor.nombres}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
