'use client'

import { useState, useEffect } from 'react'
import { FileSpreadsheet, Download, Loader2, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Facultad {
  id: string
  nombre: string
  codigo: string
}

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
        const res = await fetch('/api/mesa-partes/reporte')
        const data = await res.json()
        if (data.success) {
          setFacultades(data.facultades)
          setAnios(data.anios)
          if (data.anios.length > 0) {
            setAnio(String(data.anios[0]))
          }
        }
      } catch {
        setError('Error al cargar datos iniciales')
      } finally {
        setLoadingData(false)
      }
    }
    cargarDatos()
  }, [])

  async function descargarReporte() {
    if (!facultadId || !anio) {
      setError('Selecciona una facultad y un año')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(
        `/api/mesa-partes/reporte?facultadId=${encodeURIComponent(facultadId)}&anio=${encodeURIComponent(anio)}`
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || 'Error al generar el reporte')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-tesis-${anio}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar el reporte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes de Mesa de Partes</h1>
          <p className="text-sm text-muted-foreground">
            Genera reportes en Excel con el registro de proyectos de tesis
          </p>
        </div>
      </div>

      {/* Card de filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generar Reporte Excel</CardTitle>
          <CardDescription>
            Selecciona la facultad y el año para generar el reporte de registro de tesis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando datos...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Select Facultad */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Facultad</label>
                  <Select value={facultadId} onValueChange={setFacultadId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar facultad" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultades.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Select Año */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Año</label>
                  <Select value={anio} onValueChange={setAnio}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar año" />
                    </SelectTrigger>
                    <SelectContent>
                      {anios.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botón */}
                <div className="flex items-end">
                  <Button
                    onClick={descargarReporte}
                    disabled={loading || !facultadId || !anio}
                    className="w-full sm:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Generar Reporte Excel
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card informativa */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">Contenido del Reporte</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">PROYECTO DE TESIS</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>N° correlativo</li>
                <li>Tesista 1 y Tesista 2</li>
                <li>Carrera profesional</li>
                <li>Nombre de la tesis</li>
                <li>Asesor y co-asesor</li>
                <li>Fecha de presentación y N° de expediente</li>
                <li>Resolución de conformación de jurado</li>
                <li>Nombres del jurado revisor</li>
                <li>Observación y resolución de aprobación</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">INFORME FINAL</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Fecha de presentación del informe</li>
                <li>N° de expediente</li>
                <li>Resolución de jurado de informe final</li>
                <li>Resolución de sustentación</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
