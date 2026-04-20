'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Loader2, ArrowRight, Download } from 'lucide-react'
import { PanelAprobacionDesistimiento } from '@/components/desistimiento/panel-aprobacion'
import { DesistimientoTimeline } from '@/components/desistimiento/timeline'
import { ESTADO_SOLICITUD_CONFIG, MOTIVO_COLOR } from '@/components/desistimiento/constants'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import { cn } from '@/lib/utils'

interface CadenaDoc {
  id: string
  tipo: string
  nombre: string
  version: number
  esVersionActual: boolean
  esModificatoria: boolean
  reemplazaDocumentoId: string | null
  createdAt: string
}

interface Detalle {
  id: string; estadoSolicitud: keyof typeof ESTADO_SOLICITUD_CONFIG;
  solicitadoAt: string; aprobadoAt: string | null; aprobadoPor: string | null;
  motivoCategoria: string; motivoDescripcion: string; motivoRechazoMesaPartes: string | null;
  estadoTesisAlSolicitar: string; faseActual: string | null; teniaCoautor: boolean;
  requiereModificatoria: boolean;
  hayCoautorQueContinua: boolean;
  estudiante: { nombreCompleto: string; email: string; documento: string; carrera: string; facultad: string };
  tesis: {
    id: string; titulo: string; estado: string;
    coautoresActivos: Array<{ id: string; nombre: string; codigo: string }>;
    asesores: Array<{ nombre: string; tipo: string }>;
    resolucionesVigentes: Array<{ id: string; tipo: string; nombre: string; version: number; createdAt: string }>;
    cadenaResoluciones: CadenaDoc[];
  };
  resolucionModificatoria: { id: string; nombre: string } | null;
}

const TIPO_RESOLUCION_LABEL: Record<string, string> = {
  RESOLUCION_JURADO: 'Resolución de conformación de jurado',
  RESOLUCION_APROBACION: 'Resolución de aprobación de proyecto',
}

export default function DesistimientoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Detalle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/mesa-partes/desistimientos/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive && d) setData(d) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
  if (!data) return <div className="py-20 text-center">No encontrado</div>

  const cfg = ESTADO_SOLICITUD_CONFIG[data.estadoSolicitud]

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/mesa-partes/desistimientos" className="text-muted-foreground hover:text-foreground">← Solicitudes</Link>
        </div>

        <div className="flex items-start gap-4">
          <Button asChild variant="outline" size="icon"><Link href="/mesa-partes/desistimientos"><ArrowLeft className="w-4 h-4" /></Link></Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge className={cn(cfg.bgColor, cfg.color, 'gap-1')}>{cfg.icon}{cfg.label}</Badge>
              {data.teniaCoautor && <Badge variant="outline">Con coautor</Badge>}
            </div>
            <h1 className="text-xl font-bold mt-2">{data.tesis.titulo}</h1>
          </div>
        </div>

        {/* Timeline visual del flujo */}
        <DesistimientoTimeline
          estadoSolicitud={data.estadoSolicitud}
          solicitadoAt={data.solicitadoAt}
          aprobadoAt={data.aprobadoAt}
          aprobadoPor={data.aprobadoPor}
          motivoRechazo={data.motivoRechazoMesaPartes}
          solicitanteNombre={data.estudiante.nombreCompleto}
        />

        <Card>
          <CardHeader><CardTitle>Estudiante que solicita desistimiento</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Nombre:</span> {data.estudiante.nombreCompleto}</div>
            <div><span className="text-muted-foreground">DNI:</span> {data.estudiante.documento}</div>
            <div><span className="text-muted-foreground">Email:</span> {data.estudiante.email}</div>
            <div><span className="text-muted-foreground">Carrera:</span> {data.estudiante.carrera}</div>
            <div><span className="text-muted-foreground">Facultad:</span> {data.estudiante.facultad}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Motivo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge className={cn(MOTIVO_COLOR[data.motivoCategoria] ?? 'bg-gray-100', 'text-sm')}>
              {MOTIVO_LABEL[data.motivoCategoria as keyof typeof MOTIVO_LABEL] ?? data.motivoCategoria}
            </Badge>
            <p className="text-sm whitespace-pre-wrap">{data.motivoDescripcion}</p>
          </CardContent>
        </Card>

        {data.tesis.coautoresActivos.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Coautor(es) que continuarán</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.tesis.coautoresActivos.map(c => (
                <div key={c.id}>{c.nombre} <span className="text-muted-foreground">— {c.codigo}</span></div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.tesis.cadenaResoluciones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {data.estadoSolicitud === 'APROBADO' ? 'Cadena de resoluciones' : 'Resoluciones vigentes'}
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({data.tesis.resolucionesVigentes.length} vigente{data.tesis.resolucionesVigentes.length === 1 ? '' : 's'})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['RESOLUCION_JURADO', 'RESOLUCION_APROBACION'] as const).map(tipo => {
                const docsDeEsteTipo = data.tesis.cadenaResoluciones
                  .filter(d => d.tipo === tipo)
                  .sort((a, b) => a.version - b.version)
                if (docsDeEsteTipo.length === 0) return null
                return (
                  <div key={tipo} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {TIPO_RESOLUCION_LABEL[tipo]}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {docsDeEsteTipo.map((d, idx) => (
                        <div key={d.id} className="flex items-center gap-2">
                          <div
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
                              d.esVersionActual
                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                                : 'border-muted bg-muted/30 opacity-70',
                            )}
                          >
                            <FileText className={cn('w-3.5 h-3.5', d.esVersionActual ? 'text-emerald-600' : 'text-muted-foreground')} />
                            <span className="text-xs font-medium">v{d.version}</span>
                            {d.esModificatoria && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-400 text-amber-700">
                                Modificatoria
                              </Badge>
                            )}
                            {d.esVersionActual && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-emerald-400 text-emerald-700">
                                Vigente
                              </Badge>
                            )}
                          </div>
                          {idx < docsDeEsteTipo.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {data.estadoSolicitud === 'PENDIENTE' && data.requiereModificatoria && (
                <p className="text-xs text-amber-700 mt-2">Al aprobar, deberás subir las modificatorias correspondientes.</p>
              )}
            </CardContent>
          </Card>
        )}

        {data.estadoSolicitud === 'PENDIENTE' && (
          <PanelAprobacionDesistimiento
            desistimientoId={data.id}
            thesisId={data.tesis.id}
            requiereModificatoria={data.requiereModificatoria}
            hayCoautorQueContinua={data.hayCoautorQueContinua}
            resolucionesVigentes={data.tesis.resolucionesVigentes}
            onDone={() => router.push('/mesa-partes/desistimientos')}
          />
        )}

        {data.estadoSolicitud === 'APROBADO' && data.aprobadoPor && (
          <Card>
            <CardContent className="py-4 text-sm space-y-3">
              <div>
                Aprobado por <b>{data.aprobadoPor}</b> el {new Date(data.aprobadoAt!).toLocaleString('es-PE', { timeZone: 'America/Lima' })}.
                {data.resolucionModificatoria && (<div className="mt-2">Resolución modificatoria: {data.resolucionModificatoria.nombre}</div>)}
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/mesa-partes/desistimientos/${data.id}/acta`} target="_blank" rel="noopener">
                  <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                  Descargar acta de desistimiento (PDF)
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {data.estadoSolicitud === 'RECHAZADO' && data.motivoRechazoMesaPartes && (
          <Card><CardContent className="py-4 text-sm">
            <b>Motivo del rechazo:</b> {data.motivoRechazoMesaPartes}
          </CardContent></Card>
        )}
      </div>
    </div>
  )
}
