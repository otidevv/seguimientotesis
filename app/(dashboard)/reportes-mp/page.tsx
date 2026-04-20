'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Inbox,
  Loader2,
  Search,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// Columnas del reporte (coinciden 1:1 con el Excel). minW en px.
const PROYECTO_COLUMNS: Array<{ key: keyof PreviewRow; label: string; minW: number; align?: 'center' | 'left' }> = [
  { key: 'numero',                 label: 'N°',                          minW: 48,  align: 'center' },
  { key: 'tesista1',               label: 'TESISTA 1',                   minW: 200 },
  { key: 'tesista2',               label: 'TESISTA 2',                   minW: 200 },
  { key: 'carrera',                label: 'CARRERA PROF.',               minW: 150 },
  { key: 'titulo',                 label: 'NOMBRE DE TESIS',             minW: 300 },
  { key: 'asesor',                 label: 'ASESOR',                      minW: 200 },
  { key: 'coasesor',               label: 'CO-ASESOR',                   minW: 200 },
  { key: 'fechaPresentacion',      label: 'FECHA DE PRESENTACIÓN',       minW: 130 },
  { key: 'nroExpediente',          label: 'NRO DE EXPEDIENTE',           minW: 120 },
  { key: 'resolucionJurado',       label: 'RESOLUCIÓN CONFORMACIÓN JURADO', minW: 180 },
  { key: 'fechaResolucionJurado',  label: 'FECHA',                       minW: 110 },
  { key: 'juradosRevisores',       label: 'NOMBRE DEL JURADO REVISOR',   minW: 260 },
  { key: 'observacion',            label: 'OBSERVACIÓN',                 minW: 200 },
  { key: 'resolucionAprobacion',   label: 'RESOLUCIÓN APROBACIÓN PROYECTO', minW: 180 },
]

const INFORME_COLUMNS: Array<{ key: keyof PreviewRow; label: string; minW: number }> = [
  { key: 'fechaPresentacionInforme', label: 'FECHA PRESENTACIÓN',         minW: 130 },
  { key: 'nroExpedienteInforme',     label: 'NRO EXPEDIENTE',             minW: 120 },
  { key: 'resolucionJuradoInforme',  label: 'RESOLUCIÓN JURADO INFORME FINAL', minW: 180 },
  { key: 'resolucionSustentacion',   label: 'RESOLUCIÓN SUSTENTACIÓN',    minW: 180 },
]

interface Facultad {
  id: string
  nombre: string
  codigo: string
}

interface PreviewRow {
  numero: number
  tesista1: string
  tesista2: string
  carrera: string
  titulo: string
  asesor: string
  coasesor: string
  fechaPresentacion: string | null
  nroExpediente: string
  resolucionJurado: string
  fechaResolucionJurado: string | null
  juradosRevisores: string
  observacion: string
  resolucionAprobacion: string
  fechaPresentacionInforme: string | null
  nroExpedienteInforme: string
  resolucionJuradoInforme: string
  resolucionSustentacion: string
  estado?: string
}

interface PreviewResponse {
  facultad: { nombre: string; codigo: string }
  anio: number
  data: PreviewRow[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

const LIMIT = 10

function formatearFecha(fecha: string | null): string {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function renderCell(row: PreviewRow, key: keyof PreviewRow): string {
  const value = row[key]
  if (value === null || value === undefined) return ''
  if (
    key === 'fechaPresentacion' ||
    key === 'fechaResolucionJurado' ||
    key === 'fechaPresentacionInforme'
  ) {
    return formatearFecha(value as string | null)
  }
  return String(value)
}

export default function ReportesMpPage() {
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [anios, setAnios] = useState<number[]>([])
  const [facultadId, setFacultadId] = useState('')
  const [anio, setAnio] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [page, setPage] = useState(1)

  const [initialLoading, setInitialLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const [preview, setPreview] = useState<PreviewResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function cargar() {
      try {
        const result = await api.get<{ facultades: Facultad[]; anios: number[] }>(
          '/api/mesa-partes/reporte'
        )
        if (cancelled) return
        setFacultades(result.facultades)
        setAnios(result.anios)
        if (result.anios.length > 0) setAnio(String(result.anios[0]))
        if (result.facultades.length === 1) {
          // Scope de facultad → preseleccionar.
          setFacultadId(result.facultades[0].id)
        }
      } catch {
        if (!cancelled) setError('Error al cargar datos iniciales')
      } finally {
        if (!cancelled) setInitialLoading(false)
      }
    }
    cargar()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setBusquedaDebounced(busqueda.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    setPage(1)
  }, [facultadId, anio])

  const loadPreview = useCallback(async () => {
    if (!facultadId || !anio) {
      setPreview(null)
      return
    }
    setError('')
    setPreviewLoading(true)
    try {
      const result = await api.get<PreviewResponse>('/api/mesa-partes/reporte', {
        params: {
          facultadId,
          anio,
          formato: 'json',
          page,
          limit: LIMIT,
          busqueda: busquedaDebounced || undefined,
        },
      })
      setPreview(result)
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : 'Error al cargar la vista previa')
    } finally {
      setPreviewLoading(false)
    }
  }, [facultadId, anio, page, busquedaDebounced])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const facultadSeleccionada = useMemo(
    () => facultades.find((f) => f.id === facultadId) ?? null,
    [facultades, facultadId]
  )

  async function descargarReporte() {
    if (!facultadId || !anio) {
      setError('Selecciona una facultad y un año')
      return
    }
    setError('')
    setDownloading(true)
    try {
      const params = new URLSearchParams({ facultadId, anio })
      if (busquedaDebounced) params.set('busqueda', busquedaDebounced)
      const res = await fetch(`/api/mesa-partes/reporte?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error || 'Error al generar el reporte')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const sufijo = busquedaDebounced ? '-filtrado' : ''
      a.download = `reporte-tesis-${facultadSeleccionada?.codigo || 'reporte'}-${anio}${sufijo}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el reporte')
    } finally {
      setDownloading(false)
    }
  }

  const totalItems = preview?.pagination.totalItems ?? 0
  const totalPages = preview?.pagination.totalPages ?? 1
  const puedeDescargar = Boolean(facultadId && anio) && !downloading && totalItems > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes MP</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vista previa y exportación en Excel de proyectos de tesis por facultad y año
          </p>
        </div>

        <Button
          onClick={descargarReporte}
          disabled={!puedeDescargar}
          size="sm"
          className="sm:self-end"
        >
          {downloading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando…</>
          ) : (
            <><Download className="mr-2 h-4 w-4" /> Descargar Excel</>
          )}
        </Button>
      </div>

      {/* Filtros */}
      <Card className="overflow-hidden">
        <div className="grid gap-4 p-4 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Facultad</label>
            {initialLoading ? (
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            ) : (
              <Select
                value={facultadId}
                onValueChange={(v) => { setFacultadId(v); setError('') }}
                disabled={facultades.length <= 1 && facultadId !== ''}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleccionar facultad…" />
                </SelectTrigger>
                <SelectContent>
                  {facultades.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Año</label>
            {initialLoading ? (
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            ) : (
              <Select value={anio} onValueChange={(v) => { setAnio(v); setError('') }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Año…" />
                </SelectTrigger>
                <SelectContent>
                  {anios.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="sm:col-span-6 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Título, tesista o asesor…"
                className="pl-9 bg-background"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                disabled={!facultadId || !anio}
              />
            </div>
          </div>
        </div>

        {(facultadSeleccionada && anio && !initialLoading) && (
          <div className="border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>
                Reporte de <span className="font-medium text-foreground">{facultadSeleccionada.nombre}</span> del año <span className="font-medium text-foreground">{anio}</span>
              </span>
            </span>
            {busquedaDebounced && (
              <span className="inline-flex items-center gap-1">
                <span>·</span>
                <span>Filtrado por <span className="font-medium text-foreground">&quot;{busquedaDebounced}&quot;</span></span>
              </span>
            )}
            {!previewLoading && preview && (
              <span className="ml-auto">
                <span className="font-medium text-foreground">{totalItems}</span> {totalItems === 1 ? 'tesis' : 'tesis'}
              </span>
            )}
          </div>
        )}
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className={cn('relative', previewLoading && 'opacity-60 pointer-events-none')}>
          {previewLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/30">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!facultadId || !anio ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Selecciona facultad y año</h3>
              <p className="text-xs text-muted-foreground">Elegí los filtros para ver la vista previa del reporte.</p>
            </div>
          ) : !preview || preview.data.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Inbox className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Sin resultados</h3>
              <p className="text-xs text-muted-foreground">
                {busquedaDebounced
                  ? 'No se encontraron tesis que coincidan con la búsqueda.'
                  : 'No hay tesis registradas para la facultad y año seleccionados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                {/* Cabeceras agrupadas (igual que en Excel) */}
                <thead>
                  <tr>
                    <th
                      colSpan={PROYECTO_COLUMNS.length}
                      className="bg-[#1F4E79] text-white font-bold text-center border border-white/20 py-2"
                    >
                      PROYECTO DE TESIS
                    </th>
                    <th
                      colSpan={INFORME_COLUMNS.length}
                      className="bg-[#2E75B6] text-white font-bold text-center border border-white/20 py-2"
                    >
                      INFORME FINAL
                    </th>
                  </tr>
                  <tr>
                    {PROYECTO_COLUMNS.map((col) => (
                      <th
                        key={`ph-${col.key}`}
                        style={{ minWidth: col.minW }}
                        className="bg-[#2E75B6] text-white font-semibold text-[10px] uppercase text-center align-middle border border-white/10 px-2 py-2"
                      >
                        {col.label}
                      </th>
                    ))}
                    {INFORME_COLUMNS.map((col) => (
                      <th
                        key={`ih-${col.key}`}
                        style={{ minWidth: col.minW }}
                        className="bg-[#5B9BD5] text-white font-semibold text-[10px] uppercase text-center align-middle border border-white/10 px-2 py-2"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.data.map((row, idx) => {
                    const zebra = idx % 2 === 1 ? 'bg-[#F2F7FB] dark:bg-muted/30' : 'bg-background'
                    return (
                      <tr key={`${row.numero}-${row.nroExpediente}`} className={zebra}>
                        {PROYECTO_COLUMNS.map((col) => (
                          <td
                            key={`pd-${col.key}`}
                            className={cn(
                              'whitespace-pre-wrap border border-border/60 px-2 py-2 align-top text-[11px] leading-snug',
                              col.align === 'center' && 'text-center',
                              col.key === 'numero' && 'font-mono text-muted-foreground',
                              col.key === 'titulo' && 'font-medium',
                            )}
                          >
                            {renderCell(row, col.key)}
                          </td>
                        ))}
                        {INFORME_COLUMNS.map((col) => (
                          <td
                            key={`id-${col.key}`}
                            className="whitespace-pre-wrap border border-border/60 px-2 py-2 align-top text-[11px] leading-snug"
                          >
                            {renderCell(row, col.key)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {preview && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{(page - 1) * LIMIT + 1}</span>
              {' – '}
              <span className="font-medium text-foreground">{Math.min(page * LIMIT, totalItems)}</span>
              {' de '}
              <span className="font-medium text-foreground">{totalItems}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || previewLoading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || previewLoading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
