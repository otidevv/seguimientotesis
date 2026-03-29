'use client'

import { useState, useEffect } from 'react'
import { FileSpreadsheet, Download, Loader2, Table2, FileText, Users, GraduationCap, Gavel, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Facultad {
  id: string
  nombre: string
  codigo: string
}

const COLUMNAS_PROYECTO = [
  'N° correlativo',
  'Tesista 1 y Tesista 2',
  'Carrera profesional',
  'Nombre de la tesis',
  'Asesor y co-asesor',
  'Fecha de presentación y N° de expediente',
  'Resolución de conformación de jurado',
  'Nombres del jurado revisor',
  'Observación y resolución de aprobación',
]

const COLUMNAS_INFORME = [
  'Fecha de presentación del informe',
  'N° de expediente',
  'Resolución de jurado de informe final',
  'Resolución de sustentación',
]

export default function ReportesMesaPartesPage() {
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [anios, setAnios] = useState<number[]>([])
  const [facultadId, setFacultadId] = useState('')
  const [anio, setAnio] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarDatos() {
      try {
        const result = await api.get<{ facultades: Facultad[]; anios: number[] }>('/api/mesa-partes/reporte')
        setFacultades(result.facultades)
        setAnios(result.anios)
        if (result.anios.length > 0) setAnio(String(result.anios[0]))
      } catch {
        setError('Error al cargar datos iniciales')
      } finally {
        setLoadingData(false)
      }
    }
    cargarDatos()
  }, [])

  async function descargarReporte() {
    if (!facultadId || !anio) { setError('Selecciona una facultad y un año'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch(`/api/mesa-partes/reporte?facultadId=${encodeURIComponent(facultadId)}&anio=${encodeURIComponent(anio)}`)
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || 'Error al generar el reporte') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `reporte-tesis-${facultades.find(f => f.id === facultadId)?.codigo || ''}-${anio}.xlsx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el reporte')
    } finally { setLoading(false) }
  }

  const facultadSeleccionada = facultades.find(f => f.id === facultadId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes de Mesa de Partes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Genera reportes en Excel con el registro completo de proyectos de tesis
        </p>
      </div>

      {/* Generator Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Left: Form */}
          <div className="flex-1 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Generar Reporte Excel</h2>
                <p className="text-xs text-muted-foreground">Selecciona facultad y año</p>
              </div>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Cargando datos...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Facultad</label>
                    <Select value={facultadId} onValueChange={(v) => { setFacultadId(v); setError('') }}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Seleccionar facultad..." />
                      </SelectTrigger>
                      <SelectContent>
                        {facultades.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Año</label>
                    <Select value={anio} onValueChange={(v) => { setAnio(v); setError('') }}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Seleccionar año..." />
                      </SelectTrigger>
                      <SelectContent>
                        {anios.map((a) => (
                          <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={descargarReporte}
                  disabled={loading || !facultadId || !anio}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando reporte...</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" />Descargar Reporte Excel</>
                  )}
                </Button>

                {facultadSeleccionada && anio && !loading && (
                  <p className="text-xs text-muted-foreground">
                    Se generará el reporte de <span className="font-medium text-foreground">{facultadSeleccionada.nombre}</span> del año <span className="font-medium text-foreground">{anio}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="border-t lg:border-t-0 lg:border-l bg-muted/30 p-6 lg:w-[320px]">
            <div className="flex items-center gap-2 mb-4">
              <Table2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contenido del Reporte</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="outline" className="text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900">
                    <FileText className="h-2.5 w-2.5" />
                    Proyecto de Tesis
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {COLUMNAS_PROYECTO.map((col) => (
                    <li key={col} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/30 mt-1.5 flex-shrink-0" />
                      {col}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="h-px bg-border" />

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                    <Gavel className="h-2.5 w-2.5" />
                    Informe Final
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {COLUMNAS_INFORME.map((col) => (
                    <li key={col} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/30 mt-1.5 flex-shrink-0" />
                      {col}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
